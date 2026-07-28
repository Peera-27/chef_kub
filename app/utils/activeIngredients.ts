import type { ImageItem } from "./types";

/**
 * Builds the ingredient list used for recipe controls and generation.
 * Gallery detections are independent from the optional history selection.
 */
export function getActiveIngredients(
  gallery: ImageItem[],
  selectedHistoryItems: string[] | null,
): string[] {
  const names = [
    ...gallery.flatMap((image) => image.items.map((item) => item.name)),
    ...(selectedHistoryItems ?? []),
  ];
  const uniqueNames = new Set<string>();

  for (const name of names) {
    const trimmedName = name.trim();
    if (trimmedName) uniqueNames.add(trimmedName);
  }

  return Array.from(uniqueNames);
}
