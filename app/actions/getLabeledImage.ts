"use server";

import { createSupabaseAdmin } from "../lib/supabase/server";
import { yoloToImagePixels } from "../utils/toYoloBBox";
import type { BoundingBox, DetectionSource, IngredientItem } from "../utils/types";

export interface LabeledImageFromDb {
  imageWidth: number;
  imageHeight: number;
  items: IngredientItem[];
  boxes: BoundingBox[];
}

export async function getLabeledImageByHash(
  hash: string,
): Promise<LabeledImageFromDb | null> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return null;

  const { data: image, error } = await supabase
    .from("images")
    .select("id, width, height")
    .eq("image_hash", hash)
    .order("created_at", { ascending: false })
    .limit(1);

  const imageRow = image?.[0];
  if (error || !imageRow) return null;

  const { data: annotations } = await supabase
    .from("annotations")
    .select("class_name, x_center, y_center, width, height, source")
    .eq("image_id", imageRow.id);

  if (!annotations?.length) return null;

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
  };
}
