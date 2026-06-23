"use server";

import { createSupabaseAdmin } from "../lib/supabase/server";
import type { ClassEntry } from "../utils/classRegistry";
import { findSimilarLabels, normalizeLabelName } from "../utils/normalizeLabel";
import { getThaiLabelOptions } from "../utils/thaiLabelOptions";

async function seedClassesIfEmpty(): Promise<ClassEntry[]> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return [];

  const { count } = await supabase
    .from("classes")
    .select("id", { count: "exact", head: true });

  if (count && count > 0) {
    const { data } = await supabase
      .from("classes")
      .select("id, name_th")
      .order("id");
    return (data ?? []).map((row) => ({ id: row.id, name: row.name_th }));
  }

  const rows = getThaiLabelOptions().map((name) => ({
    name_th: name,
    name_normalized: normalizeLabelName(name),
    source: "seed" as const,
  }));

  const { error } = await supabase
    .from("classes")
    .upsert(rows, { onConflict: "name_normalized", ignoreDuplicates: true });

  if (error) {
    console.error("Seed classes error:", error);
    return [];
  }

  const { data } = await supabase
    .from("classes")
    .select("id, name_th")
    .order("id");

  return (data ?? []).map((row) => ({ id: row.id, name: row.name_th }));
}

export async function listClasses(): Promise<ClassEntry[]> {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return getThaiLabelOptions().map((name, index) => ({
      id: index,
      name,
    }));
  }

  try {
    return await seedClassesIfEmpty();
  } catch (error) {
    console.error("listClasses error:", error);
    return getThaiLabelOptions().map((name, index) => ({
      id: index,
      name,
    }));
  }
}

export async function addClass(
  name: string,
): Promise<
  | { ok: true; entry: ClassEntry }
  | { ok: false; error: string; similar?: string[] }
> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "ชื่อสั้นเกินไป (อย่างน้อย 2 ตัวอักษร)" };
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: "ยังไม่ได้ตั้งค่า Supabase" };
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
  if (similar.length > 0) {
    return {
      ok: false,
      error: "มีชื่อที่คล้ายกันอยู่แล้ว — เลือกจากรายการแทน",
      similar: similar.slice(0, 5),
    };
  }

  const { data, error } = await supabase
    .from("classes")
    .insert({
      name_th: trimmed,
      name_normalized: normalized,
      source: "user",
    })
    .select("id, name_th")
    .single();

  if (error || !data) {
    console.error("addClass error:", error);
    return { ok: false, error: error?.message ?? "เพิ่มชื่อไม่สำเร็จ" };
  }

  return { ok: true, entry: { id: data.id, name: data.name_th } };
}
