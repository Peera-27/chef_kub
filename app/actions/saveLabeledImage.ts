"use server";

import { chunkRows, d1Query, isD1Configured } from "../lib/cloudflare/d1";
import {
  decodeDataUrl,
  isR2Configured,
  r2PutObject,
} from "../lib/cloudflare/r2";
import { normalizeLabelName } from "../utils/normalizeLabel";
import { toYoloBBoxFromImagePixels } from "../utils/toYoloBBox";
import type { DetectionSource } from "../utils/types";

export interface LabeledBoxInput {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  source: DetectionSource;
}

export interface SaveLabeledImageInput {
  imageBase64: string; // data URL ของรูป — อัพขึ้น R2 เพื่อใช้เป็น training data
  imageHash: string; // SHA-256 ของไฟล์ (client คำนวณ)
  phash: string; // dHash 64 bit (client คำนวณ)
  sessionId: string;
  imageWidth: number;
  imageHeight: number;
  boxes: LabeledBoxInput[];
}

/**
 * รูปเป็นของแถม ไม่ใช่ของบังคับ — ถ้า R2 ล่มหรือยังไม่ได้ตั้งค่า ก็ยังต้องเซฟ
 * annotations ลง D1 ให้ได้ เพราะนั่นคือ label ที่ผู้ใช้เพิ่งแก้ด้วยมือ
 */
async function uploadImage(
  imageBase64: string,
  sessionId: string,
  imageId: string,
): Promise<string | null> {
  if (!isR2Configured()) return null;

  const decoded = decodeDataUrl(imageBase64);
  if (!decoded) {
    console.warn("รูปไม่ใช่ data URL ที่รองรับ — ข้ามการอัพขึ้น R2");
    return null;
  }

  const key = `${sessionId}/${imageId}.${decoded.extension}`;
  try {
    await r2PutObject(key, decoded.bytes, decoded.contentType);
    return key;
  } catch (error) {
    console.error("R2 upload error:", error);
    return null;
  }
}

async function resolveClassIds(labels: string[]): Promise<Map<string, number>> {
  const normalized = [...new Set(labels.map(normalizeLabelName))];
  if (normalized.length === 0) return new Map();

  const placeholders = normalized.map(() => "?").join(", ");
  const rows = await d1Query<{ id: number; name_normalized: string }>(
    `SELECT id, name_normalized FROM classes WHERE name_normalized IN (${placeholders})`,
    normalized,
  );

  return new Map(rows.map((row) => [row.name_normalized, row.id]));
}

export async function saveLabeledImage(
  input: SaveLabeledImageInput,
): Promise<{ ok: boolean; imageId?: string; error?: string }> {
  if (!isD1Configured()) {
    console.warn("Cloudflare D1 ไม่ได้ตั้งค่า — ข้ามการบันทึก label");
    return { ok: false, error: "missing_config" };
  }

  if (input.boxes.length === 0) {
    return { ok: false, error: "no_boxes" };
  }

  if (!input.imageHash) {
    return { ok: false, error: "missing_hash" };
  }

  try {
    const existing = await d1Query<{ id: string; storage_path: string | null }>(
      "SELECT id, storage_path FROM images WHERE image_hash = ?",
      [input.imageHash],
    );

    let imageId: string;

    if (existing.length > 0) {
      imageId = existing[0].id;
      // รูปเดิม ไฟล์เดิม (hash ตรง) — อัพซ้ำเฉพาะตอนที่ยังไม่เคยอัพติด
      const storagePath =
        existing[0].storage_path ??
        (await uploadImage(input.imageBase64, input.sessionId, imageId));

      await d1Query(
        `UPDATE images SET width = ?, height = ?, session_id = ?, phash = ?, storage_path = ?
         WHERE id = ?`,
        [
          input.imageWidth,
          input.imageHeight,
          input.sessionId,
          input.phash,
          storagePath,
          imageId,
        ],
      );
      await d1Query("DELETE FROM annotations WHERE image_id = ?", [imageId]);
    } else {
      imageId = crypto.randomUUID();
      const storagePath = await uploadImage(
        input.imageBase64,
        input.sessionId,
        imageId,
      );

      await d1Query(
        `INSERT INTO images (id, width, height, session_id, image_hash, phash, storage_path)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          imageId,
          input.imageWidth,
          input.imageHeight,
          input.sessionId,
          input.imageHash,
          input.phash,
          storagePath,
        ],
      );
    }

    const classIdByLabel = await resolveClassIds(
      input.boxes.map((box) => box.label),
    );

    const annotationRows = input.boxes.map((box) => {
      const yolo = toYoloBBoxFromImagePixels(
        box,
        input.imageWidth,
        input.imageHeight,
      );
      return [
        crypto.randomUUID(),
        imageId,
        box.label,
        classIdByLabel.get(normalizeLabelName(box.label)) ?? null,
        yolo.x_center,
        yolo.y_center,
        yolo.width,
        yolo.height,
        box.source,
      ];
    });

    for (const chunk of chunkRows(annotationRows, 10)) {
      const placeholders = chunk
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .join(", ");
      await d1Query(
        `INSERT INTO annotations
           (id, image_id, class_name, class_id, x_center, y_center, width, height, source)
         VALUES ${placeholders}`,
        chunk.flat(),
      );
    }

    return { ok: true, imageId };
  } catch (error) {
    console.error("saveLabeledImage error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "save_failed",
    };
  }
}
