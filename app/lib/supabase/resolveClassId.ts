import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeLabelName } from "../../utils/normalizeLabel";

export async function resolveClassIdFromDb(
  supabase: SupabaseClient,
  label: string,
): Promise<number | null> {

  const { data } = await supabase
    .from("classes")
    .select("id")
    .eq("name_normalized", normalizeLabelName(label))
    .maybeSingle();

  return data?.id ?? null;
}
