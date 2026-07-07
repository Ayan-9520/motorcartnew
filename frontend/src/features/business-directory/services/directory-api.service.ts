import { featureFlags } from "@/config/feature-flags";
import { hasConfiguredApi, joinApiUrl } from "@/lib/api/base-url";
import { fetchWithTimeout } from "@/lib/api/with-timeout";
import { getAccessToken } from "@/lib/api/axios";

export type DirectoryResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };

export const DIRECTORY_CATEGORIES = [
  { slug: "dealers", label: "Dealers" },
  { slug: "brokers", label: "Brokers" },
  { slug: "dsa", label: "DSA" },
  { slug: "insurance", label: "Insurance" },
  { slug: "workshops", label: "Workshops" },
  { slug: "parts", label: "Parts sellers" },
  { slug: "influencers", label: "Influencers" },
] as const;

function enabled() {
  return featureFlags.businessDirectoryV2 && hasConfiguredApi();
}

function monetizationEnabled() {
  return enabled() && featureFlags.directoryMonetizationK1;
}

async function directoryFetch<T>(
  path: string,
  init?: RequestInit & { auth?: boolean }
): Promise<DirectoryResult<T>> {
  if (!enabled()) return { ok: false, error: "Directory disabled", status: 404 };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.auth !== false) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  try {
    const res = await fetchWithTimeout(joinApiUrl(path), { ...init, headers }, 5000);
    const json = (await res.json().catch(() => ({}))) as T & { message?: string };
    if (!res.ok) {
      return {
        ok: false,
        error: (json as { message?: string }).message ?? res.statusText,
        status: res.status,
      };
    }
    return { ok: true, data: json, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error", status: 0 };
  }
}

export function fetchDirectoryHub() {
  return directoryFetch<{ data: Record<string, unknown> }>("/api/directory", { auth: false });
}

export function fetchDirectoryCategory(
  category: string,
  params?: Record<string, string>
) {
  const q = new URLSearchParams(params ?? {}).toString();
  return directoryFetch<{ data: Record<string, unknown>[]; category: string }>(
    `/api/directory/${category}${q ? `?${q}` : ""}`,
    { auth: false }
  );
}

export function fetchDirectoryBusiness(category: string, slug: string) {
  return directoryFetch<{ data: Record<string, unknown> }>(
    `/api/directory/${category}/${slug}`,
    { auth: false }
  );
}

export function searchDirectory(params: Record<string, string>) {
  const q = new URLSearchParams(params).toString();
  return directoryFetch<{ data: Record<string, unknown>[] }>(`/api/directory/search?${q}`, {
    auth: false,
  });
}

export function fetchDirectoryFeed(slug: string) {
  return directoryFetch<{ data: Record<string, unknown>[] }>(
    `/api/directory/business/${slug}/feed`,
    { auth: false }
  );
}

export function followDirectoryBusiness(slug: string) {
  return directoryFetch<{ data: Record<string, unknown> }>(
    `/api/directory/business/${slug}/follow`,
    { method: "POST" }
  );
}

export function unfollowDirectoryBusiness(slug: string) {
  return directoryFetch<{ data: Record<string, unknown> }>(
    `/api/directory/business/${slug}/follow`,
    { method: "DELETE" }
  );
}

export function isDirectoryEnabled() {
  return enabled();
}

export function fetchMonetizationConfig() {
  if (!monetizationEnabled()) return Promise.resolve({ ok: false as const, error: "K1 disabled", status: 404 });
  return directoryFetch<{ data: Record<string, unknown> }>("/api/directory/monetization/config", {
    auth: false,
  });
}

export function fetchFeaturedBusinesses(category?: string, limit?: number) {
  if (!monetizationEnabled()) return Promise.resolve({ ok: false as const, error: "K1 disabled", status: 404 });
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (limit != null) params.set("limit", String(limit));
  const q = params.toString();
  const path = category
    ? `/api/directory/featured/${category}${q ? `?${q}` : ""}`
    : `/api/directory/featured${q ? `?${q}` : ""}`;
  return directoryFetch<{ data: Record<string, unknown>[] }>(path, { auth: false });
}

export function fetchSponsoredBusinesses(limit?: number) {
  if (!monetizationEnabled()) return Promise.resolve({ ok: false as const, error: "K1 disabled", status: 404 });
  const q = limit != null ? `?limit=${limit}` : "";
  return directoryFetch<{ data: Record<string, unknown>[] }>(`/api/directory/sponsored${q}`, {
    auth: false,
  });
}

export function fetchPremiumListings(limit?: number) {
  if (!monetizationEnabled()) return Promise.resolve({ ok: false as const, error: "K1 disabled", status: 404 });
  const q = limit != null ? `?limit=${limit}` : "";
  return directoryFetch<{ data: Record<string, unknown>[] }>(`/api/directory/premium${q}`, {
    auth: false,
  });
}

export function fetchVerifiedBadgeBusinesses(limit?: number) {
  if (!monetizationEnabled()) return Promise.resolve({ ok: false as const, error: "K1 disabled", status: 404 });
  const q = limit != null ? `?limit=${limit}` : "";
  return directoryFetch<{ data: Record<string, unknown>[] }>(`/api/directory/verified${q}`, {
    auth: false,
  });
}

const ENTITY_TO_CATEGORY: Record<string, string> = {
  dealer: "dealers",
  broker: "brokers",
  dsa: "dsa",
  insurance_agent: "insurance",
  workshop: "workshops",
  parts_seller: "parts",
  influencer: "influencers",
};

export function entityTypeToCategorySlug(entityType: string): string {
  return ENTITY_TO_CATEGORY[entityType] ?? "dealers";
}

export function businessProfilePath(b: { entity_type?: string; slug?: string }): string {
  const cat = entityTypeToCategorySlug(String(b.entity_type ?? "dealer"));
  return `/directory/${cat}/${b.slug}`;
}
