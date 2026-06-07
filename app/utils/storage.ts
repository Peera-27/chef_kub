import { Recipe } from "../actions/generateRecipe";
import { ScanHistoryEntry } from "./types";

const FAVORITES_KEY = "chefkub_favorites";
const HISTORY_KEY = "chefkub_history";

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

export function loadHistory(): ScanHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ScanHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function addHistoryEntry(items: string[], imageCount: number) {
  const history = loadHistory();
  const entry: ScanHistoryEntry = {
    id: `${Date.now()}`,
    date: new Date().toLocaleString("th-TH"),
    items,
    imageCount,
  };
  const updated = [entry, ...history].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}
