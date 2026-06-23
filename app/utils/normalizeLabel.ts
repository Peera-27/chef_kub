export function normalizeLabelName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[b.length][a.length];
}

export function findSimilarLabels(input: string, existing: string[]): string[] {
  const normalized = normalizeLabelName(input);
  if (!normalized) return [];

  return existing.filter((name) => {
    const candidate = normalizeLabelName(name);
    if (candidate === normalized) return true;
    if (candidate.includes(normalized) || normalized.includes(candidate)) return true;

    const maxLen = Math.max(candidate.length, normalized.length);
    const threshold = Math.max(1, Math.floor(maxLen * 0.25));
    return levenshtein(candidate, normalized) <= threshold;
  });
}
