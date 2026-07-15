import { labels } from "./labels";
import { labelThMap } from "./labelsTh";

let cached: string[] | null = null;

export function getThaiLabelOptions(): string[] {
  if (cached) return cached;

  const set = new Set<string>();
  for (const english of labels) {
    set.add(labelThMap[english] ?? english);
  }
  // Include every Thai label explicitly defined in labelsTh.ts, even when its
  // English key isn't part of the labels array, so the full dataset shows up.
  for (const thai of Object.values(labelThMap)) {
    set.add(thai);
  }

  cached = Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  return cached;
}
