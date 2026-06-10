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

export function isFavorite(name: string): boolean {
  return loadFavorites().some((r) => r.name === name);
}
