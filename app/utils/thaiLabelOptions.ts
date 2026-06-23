import { labels } from "./labels";
import { labelThMap } from "./labelsTh";

let cached: string[] | null = null;

export function getThaiLabelOptions(): string[] {
  if (cached) return cached;

  const set = new Set<string>();
  for (const english of labels) {
    set.add(labelThMap[english] ?? english);
  }
  cached = Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  return cached;
}

export function filterThaiLabels(query: string): string[] {
  const q = query.trim().toLowerCase();
  const options = getThaiLabelOptions();
  if (!q) return options;
  return options.filter((label) => label.toLowerCase().includes(q));
}
