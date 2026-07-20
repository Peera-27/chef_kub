import type { CookLogEntry, CookRating } from "../types";

const COOK_LOG_KEY = "chefkub_cook_log";

export function loadCookLog(): CookLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COOK_LOG_KEY);
    return raw ? (JSON.parse(raw) as CookLogEntry[]) : [];
  } catch {
    return [];
  }
}

/** กดซ้ำเพื่อเปลี่ยนใจได้ — ทับของเดิมของเมนูเดียวกัน ไม่สะสมซ้ำ */
export function recordCookRating(
  recipeName: string,
  rating: CookRating,
): CookLogEntry[] {
  const log = loadCookLog();
  const entry: CookLogEntry = {
    recipeName,
    rating,
    cookedAt: Date.now(),
  };
  const updated = [entry, ...log.filter((e) => e.recipeName !== recipeName)];
  localStorage.setItem(COOK_LOG_KEY, JSON.stringify(updated));
  return updated;
}

export function getCookRating(recipeName: string): CookRating | null {
  return loadCookLog().find((e) => e.recipeName === recipeName)?.rating ?? null;
}
