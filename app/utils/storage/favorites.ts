import type { Recipe } from "../../types/recipe";

const FAVORITES_KEY = "chefkub_favorites";

export function loadFavorites(): Recipe[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as Recipe[]) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(recipes: Recipe[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(recipes));
}

export function toggleFavorite(recipe: Recipe): Recipe[] {
  const favorites = loadFavorites();
  const exists = favorites.some((r) => r.name === recipe.name);
  const updated = exists
    ? favorites.filter((r) => r.name !== recipe.name)
    : [...favorites, recipe];
  saveFavorites(updated);
  return updated;
}

/**
 * เมนูถูกกดหัวใจตั้งแต่ตอนที่ยังไม่มีรูป (รูป gen ตอนกดเข้าไปทำ) — เติมรูปย้อนหลัง
 * ให้การ์ดในหน้าโปรดมีรูปด้วย คืน true เมื่อมีการแก้จริง
 */
export function updateFavoriteImage(name: string, imageUrl: string): boolean {
  const favorites = loadFavorites();
  const target = favorites.find((r) => r.name === name);
  if (!target || target.imageUrl === imageUrl) return false;

  saveFavorites(
    favorites.map((r) => (r.name === name ? { ...r, imageUrl } : r)),
  );
  return true;
}

export function isFavorite(name: string): boolean {
  return loadFavorites().some((r) => r.name === name);
}
