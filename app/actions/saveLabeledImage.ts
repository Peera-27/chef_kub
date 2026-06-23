"use server";

import { createSupabaseAdmin } from "../lib/supabase/server";
import { hashImageBuffer } from "../lib/imageHash";
import { resolveClassIdFromDb } from "../lib/supabase/resolveClassId";
import { toYoloBBoxFromImagePixels } from "../utils/toYoloBBox";
import type { DetectionSource } from "../utils/types";

const BUCKET = "training-images";

export interface LabeledBoxInput {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  source: DetectionSource;
}

export interface SaveLabeledImageInput {
  imageBase64: string;
  sessionId: string;
  imageWidth: number;
  imageHeight: number;
  boxes: LabeledBoxInput[];
}

export async function saveLabeledImage(
  input: SaveLabeledImageInput,
): Promise<{ ok: boolean; imageId?: string; error?: string }> {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    console.warn("Supabase ไม่ได้ตั้งค่า — ข้ามการบันทึก label");
    return { ok: false, error: "missing_config" };
  }

  if (input.boxes.length === 0) {
    return { ok: false, error: "no_boxes" };
  }

  const base64Data = input.imageBase64.replace(
    /^data:image\/(png|jpeg|jpg);base64,/,
    "",
  );
  const buffer = Buffer.from(base64Data, "base64");
  const imageHash = hashImageBuffer(buffer);

  const { data: existing } = await supabase
    .from("images")
    .select("id, storage_path")
    .eq("image_hash", imageHash)
    .maybeSingle();

  let imageId: string;

  if (existing) {
    imageId = existing.id;
    await supabase
      .from("images")
      .update({
        width: input.imageWidth,
        height: input.imageHeight,
        session_id: input.sessionId,
      })
      .eq("id", imageId);

    await supabase.from("annotations").delete().eq("image_id", imageId);
  } else {
    const storagePath = `${input.sessionId}/${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { ok: false, error: uploadError.message };
    }

    const { data: imageRow, error: imageError } = await supabase
      .from("images")
      .insert({
        storage_path: storagePath,
        width: input.imageWidth,
        height: input.imageHeight,
        session_id: input.sessionId,
        image_hash: imageHash,
      })
      .select("id")
      .single();

    if (imageError || !imageRow) {
      console.error("Image insert error:", imageError);
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return { ok: false, error: imageError?.message ?? "insert_failed" };
    }

    imageId = imageRow.id;
  }

  const annotations = await Promise.all(
    input.boxes.map(async (box) => {
      const yolo = toYoloBBoxFromImagePixels(
        box,
        input.imageWidth,
        input.imageHeight,
      );
      return {
        image_id: imageId,
        class_name: box.label,
        class_id: await resolveClassIdFromDb(supabase, box.label),
        x_center: yolo.x_center,
        y_center: yolo.y_center,
        width: yolo.width,
        height: yolo.height,
        source: box.source,
      };
    }),
  );

  const { error: annError } = await supabase
    .from("annotations")
    .insert(annotations);

  if (annError) {
    console.error("Annotation insert error:", annError);
    return { ok: false, error: annError.message };
  }

  return { ok: true, imageId };
}
