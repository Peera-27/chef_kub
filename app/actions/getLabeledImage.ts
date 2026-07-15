"use server";

import { d1Query, isD1Configured } from "../lib/cloudflare/d1";
import { yoloToImagePixels } from "../utils/toYoloBBox";
import type { BoundingBox, DetectionSource, IngredientItem } from "../utils/types";

export interface LabeledImageFromDb {
  imageWidth: number;
  imageHeight: number;
  items: IngredientItem[];
  boxes: BoundingBox[];
  matchType: "exact" | "similar";
}

interface ImageRow {
  id: string;
  width: number;
  height: number;
}

interface AnnotationRow {
  class_name: string;
  x_center: number;
  y_center: number;
  width: number;
  height: number;
  source: string;
}

// รูปคล้ายกัน = dHash 64 bit ต่างกันไม่เกินกี่บิต (ยิ่งต่ำยิ่งเข้มงวด)
const MAX_HAMMING_DISTANCE = 8;
// เทียบกับรูปล่าสุดสูงสุดกี่รูป (กัน query บวมเมื่อข้อมูลโต)
const SIMILARITY_SCAN_LIMIT = 1000;

function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
}

async function findExactImage(imageHash: string): Promise<ImageRow | null> {
  const rows = await d1Query<ImageRow>(
    "SELECT id, width, height FROM images WHERE image_hash = ? LIMIT 1",
    [imageHash],
  );
  return rows[0] ?? null;
}

async function findSimilarImage(phash: string): Promise<ImageRow | null> {
  const rows = await d1Query<ImageRow & { phash: string }>(
    `SELECT id, width, height, phash FROM images
     WHERE phash IS NOT NULL
     ORDER BY created_at DESC
     LIMIT ${SIMILARITY_SCAN_LIMIT}`,
  );

  let best: ImageRow | null = null;
  let bestDistance = MAX_HAMMING_DISTANCE + 1;

  for (const row of rows) {
    const distance = hammingDistanceHex(phash, row.phash);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = row;
    }
  }

  return best;
}

export async function findLabeledImage(input: {
  imageHash: string;
  phash?: string;
}): Promise<LabeledImageFromDb | null> {
  if (!isD1Configured()) return null;

  try {
    let matchType: "exact" | "similar" = "exact";
    let imageRow = await findExactImage(input.imageHash);

    if (!imageRow && input.phash) {
      imageRow = await findSimilarImage(input.phash);
      matchType = "similar";
    }

    if (!imageRow) return null;

    const annotations = await d1Query<AnnotationRow>(
      `SELECT class_name, x_center, y_center, width, height, source
       FROM annotations WHERE image_id = ?`,
      [imageRow.id],
    );

    if (annotations.length === 0) return null;

    const boxes: BoundingBox[] = annotations.map((ann) => ({
      ...yoloToImagePixels(
        {
          x_center: ann.x_center,
          y_center: ann.y_center,
          width: ann.width,
          height: ann.height,
        },
        imageRow.width,
        imageRow.height,
      ),
      label: ann.class_name,
    }));

    const seen = new Set<string>();
    const items: IngredientItem[] = [];
    for (const ann of annotations) {
      if (seen.has(ann.class_name)) continue;
      seen.add(ann.class_name);
      items.push({
        name: ann.class_name,
        source: ann.source as DetectionSource,
      });
    }

    return {
      imageWidth: imageRow.width,
      imageHeight: imageRow.height,
      items,
      boxes,
      matchType,
    };
  } catch (error) {
    console.error("findLabeledImage error:", error);
    return null;
  }
}
