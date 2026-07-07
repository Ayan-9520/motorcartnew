import { hasConfiguredApi, joinApiUrl } from "@/lib/api/base-url";
import { fetchWithTimeout } from "@/lib/api/with-timeout";
import { featureFlags } from "@/config/feature-flags";

export type UnifiedSearchResultDto = {
  result_type: string;
  title: string;
  description: string;
  url: string;
  source: string;
  score: number;
};

export type FederatedSearchResponse = {
  query: string;
  total: number;
  results: UnifiedSearchResultDto[];
  by_type: Record<string, number>;
};

function enabled() {
  return featureFlags.unifiedSearch && hasConfiguredApi();
}

async function searchFetch<T>(path: string): Promise<T | null> {
  if (!enabled()) return null;
  try {
    const res = await fetchWithTimeout(joinApiUrl(path), undefined, 5000);
    if (!res.ok) return null;
    const json = (await res.json()) as { data: T };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export function isUnifiedSearchEnabled() {
  return enabled();
}

export function fetchFederatedSearch(params: { q: string; category?: string; limit?: number }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.category) sp.set("category", params.category);
  if (params.limit != null) sp.set("limit", String(params.limit));
  return searchFetch<FederatedSearchResponse>(`/api/search?${sp}`);
}

export function fetchSearchCategories() {
  return searchFetch<{ categories: Array<{ id: string; label: string }> }>("/api/search/categories");
}

export function fetchSearchSuggestions(q: string) {
  if (q.trim().length < 2) return Promise.resolve({ query: q, suggestions: [] as string[] });
  return searchFetch<{ query: string; suggestions: string[] }>(
    `/api/search/suggestions?q=${encodeURIComponent(q)}`
  );
}

const RECENT_KEY = "motorcart_recent_searches";

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? arr.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(q: string) {
  const term = q.trim();
  if (!term) return;
  const prev = loadRecentSearches().filter((s) => s !== term);
  localStorage.setItem(RECENT_KEY, JSON.stringify([term, ...prev].slice(0, 10)));
}
