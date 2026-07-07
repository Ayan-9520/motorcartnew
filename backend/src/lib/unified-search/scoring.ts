import type { UnifiedSearchResult } from "./types";

export function scoreMatch(query: string, fields: (string | null | undefined)[]): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  let score = 0;
  for (const f of fields) {
    if (!f) continue;
    const lower = f.toLowerCase();
    if (lower === q) score += 5;
    else if (lower.startsWith(q)) score += 3;
    else if (lower.includes(q)) score += 1;
  }
  return score;
}

export function rankResults(items: UnifiedSearchResult[], query: string): UnifiedSearchResult[] {
  const q = query.toLowerCase().trim();
  return [...items]
    .filter((i) => (q ? i.score > 0 : true))
    .sort((a, b) => b.score - a.score);
}
