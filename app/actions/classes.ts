"use server";

import { chunkRows, d1Query, isD1Configured } from "../lib/cloudflare/d1";
import type { ClassEntry } from "../utils/classRegistry";
import { findSimilarLabels, normalizeLabelName } from "../utils/normalizeLabel";
import { getThaiLabelOptions } from "../utils/thaiLabelOptions";

interface ClassRow {
  id: number;
  name_th: string;
}

function localFallback(): ClassEntry[] {
  return getThaiLabelOptions().map((name, index) => ({ id: index, name }));
}

async function loadClasses(): Promise<ClassEntry[]> {
  const rows = await d1Query<ClassRow>(
    "SELECT id, name_th FROM classes ORDER BY id",
  );
  return rows.map((row) => ({ id: row.id, name: row.name_th }));
}

// คอยเติม label จาก labelsTh.ts ที่ยังไม่มีใน DB ทุกครั้งที่เรียก (ไม่ใช่แค่ตอนตารางว่าง)
async function ensureSeededClasses(): Promise<ClassEntry[]> {
  if (!isD1Configured()) return localFallback();

  try {
    const knownLabels = getThaiLabelOptions();
    const existing = await loadClasses();

    const existingNames = new Set(
      existing.map((entry) => normalizeLabelName(entry.name)),
    );

    // เติมเฉพาะ label ที่ยังไม่มีใน DB (รองรับ label ใหม่ที่เพิ่มใน labelsTh.ts)
    const missing = knownLabels
      .filter((name) => !existingNames.has(normalizeLabelName(name)))
      .map((name) => [name, normalizeLabelName(name)]);

    if (missing.length === 0) {
      return existing.length > 0 ? existing : localFallback();
    }

    for (const chunk of chunkRows(missing, 30)) {
      const placeholders = chunk.map(() => "(?, ?, 'seed')").join(", ");
      await d1Query(
        `INSERT INTO classes (name_th, name_normalized, source) VALUES ${placeholders}
         ON CONFLICT (name_normalized) DO NOTHING`,
        chunk.flat(),
      );
    }

    const result = await loadClasses();
    // ฟอลแบ็กถ้า DB ว่างเปล่าจริง ๆ
    return result.length > 0 ? result : localFallback();
  } catch (error) {
    console.error("ensureSeededClasses error:", error);
    return localFallback();
  }
}

export async function listClasses(): Promise<ClassEntry[]> {
  return ensureSeededClasses();
}

/**
 * `force` = ผู้ใช้ยืนยันแล้วว่าไม่ใช่ชื่อซ้ำ ให้ข้ามด่านเช็คชื่อคล้าย
 *
 * ต้องเป็น server action จริง ๆ ห้ามปลอม entry ฝั่ง client เอา —
 * id ที่ปลอมขึ้นมาจะไม่มีใน D1 แล้วตอน saveLabeledImage หา class_id ไม่เจอ
 * มันจะบันทึกเป็น null เงียบ ๆ ได้ annotation ที่เทรนไม่ได้
 */
export async function addClass(
  name: string,
  options?: { force?: boolean },
): Promise<
  | { ok: true; entry: ClassEntry }
  | { ok: false; error: string; similar?: string[] }
> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "ชื่อสั้นเกินไป (อย่างน้อย 2 ตัวอักษร)" };
  }

  if (!isD1Configured()) {
    return { ok: false, error: "ยังไม่ได้ตั้งค่า Cloudflare D1" };
  }

  const existing = await listClasses();
  const normalized = normalizeLabelName(trimmed);

  const exact = existing.find(
    (entry) => normalizeLabelName(entry.name) === normalized,
  );
  if (exact) return { ok: true, entry: exact };

  const similar = findSimilarLabels(
    trimmed,
    existing.map((entry) => entry.name),
  );
  if (similar.length > 0 && !options?.force) {
    return {
      ok: false,
      error: "มีชื่อที่คล้ายกันอยู่แล้ว — เลือกจากรายการแทน",
      similar: similar.slice(0, 5),
    };
  }

  try {
    const rows = await d1Query<ClassRow>(
      `INSERT INTO classes (name_th, name_normalized, source)
       VALUES (?, ?, 'user')
       RETURNING id, name_th`,
      [trimmed, normalized],
    );

    const row = rows[0];
    if (!row) return { ok: false, error: "เพิ่มชื่อไม่สำเร็จ" };

    return { ok: true, entry: { id: row.id, name: row.name_th } };
  } catch (error) {
    console.error("addClass error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "เพิ่มชื่อไม่สำเร็จ",
    };
  }
}
