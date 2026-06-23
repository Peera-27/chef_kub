import { normalizeLabelName } from "./normalizeLabel";

export interface ClassEntry {
  id: number;
  name: string;
}

let registry: ClassEntry[] = [];

export function setClassRegistry(entries: ClassEntry[]) {
  registry = entries;
}

export function getClassRegistry(): ClassEntry[] {
  return registry;
}

export function resolveClassId(label: string): number | null {
  const normalized = normalizeLabelName(label);
  const found = registry.find(
    (entry) => normalizeLabelName(entry.name) === normalized,
  );
  return found?.id ?? null;
}

export function getClassNames(): string[] {
  return registry.map((entry) => entry.name);
}

export function filterClassNames(query: string, names?: string[]): string[] {
  const options = names ?? getClassNames();
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((name) => name.toLowerCase().includes(q));
}
