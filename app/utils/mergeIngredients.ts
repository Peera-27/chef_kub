import { IngredientItem } from "./types";

export function mergeIngredients(items: IngredientItem[]): IngredientItem[] {
  const map = new Map<string, IngredientItem>();
  for (const item of items) {
    if (!map.has(item.name)) map.set(item.name, item);
  }
  return Array.from(map.values());
}
