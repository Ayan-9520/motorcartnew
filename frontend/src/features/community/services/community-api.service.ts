/**
 * REST client for Phase I1 community APIs (active only when VITE_FEATURE_COMMUNITY_* flags are on).
 */
import { featureFlags } from "@/config/feature-flags";
import { hasConfiguredApi, joinApiUrl } from "@/lib/api/base-url";
import { fetchWithTimeout } from "@/lib/api/with-timeout";
import { getAccessToken } from "@/lib/api/axios";

function communityApiEnabled(): boolean {
  return featureFlags.communityV2 && hasConfiguredApi();
}

async function communityFetch<T>(
  path: string,
  init?: RequestInit & { auth?: boolean }
): Promise<T | null> {
  if (!communityApiEnabled()) return null;
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
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function isCommunityProfilesApiOn() {
  return communityApiEnabled() && featureFlags.communityProfiles;
}

export function isCommunityFeedApiOn() {
  return communityApiEnabled() && featureFlags.communityFeed;
}

export function isCommunityPostsApiOn() {
  return communityApiEnabled() && featureFlags.communityPosts;
}

export async function fetchMyCommunityProfile() {
  if (!isCommunityProfilesApiOn()) return null;
  return communityFetch<{ data: Record<string, unknown> }>("/api/community/profile/me");
}

export async function fetchCommunityProfileByHandle(handle: string) {
  if (!isCommunityProfilesApiOn()) return null;
  return communityFetch<{ data: Record<string, unknown> }>(
    `/api/community/profile/${encodeURIComponent(handle)}`,
    { auth: false }
  );
}

export async function fetchCommunityFeed(params: {
  type?: string;
  cursor?: string;
  limit?: number;
  handle?: string;
  business_slug?: string;
}) {
  if (!isCommunityFeedApiOn()) return null;
  const q = new URLSearchParams();
  if (params.type) q.set("type", params.type);
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.limit) q.set("limit", String(params.limit));
  if (params.handle) q.set("handle", params.handle);
  if (params.business_slug) q.set("business_slug", params.business_slug);
  const qs = q.toString();
  return communityFetch<{ data: unknown[]; next_cursor: string | null }>(
    `/api/community/feed${qs ? `?${qs}` : ""}`,
    { auth: false }
  );
}

export async function fetchCommunityPost(id: string) {
  if (!isCommunityPostsApiOn()) return null;
  return communityFetch<{ data: Record<string, unknown> }>(
    `/api/community/posts/${encodeURIComponent(id)}`,
    { auth: false }
  );
}

export function isCommunityGroupsApiOn() {
  return communityApiEnabled() && featureFlags.communityGroups;
}

export function isCommunityBusinessPagesApiOn() {
  return (
    communityApiEnabled() &&
    featureFlags.communityBusinessProfiles &&
    featureFlags.communityBusinessPages
  );
}

export async function fetchCommunityGroupsApi(params?: {
  category?: string;
  visibility?: string;
  q?: string;
}) {
  if (!isCommunityGroupsApiOn()) return null;
  const q = new URLSearchParams();
  if (params?.category) q.set("category", params.category);
  if (params?.visibility) q.set("visibility", params.visibility);
  if (params?.q) q.set("q", params.q);
  const qs = q.toString();
  return communityFetch<{ data: Record<string, unknown>[]; next_cursor: string | null }>(
    `/api/community/groups${qs ? `?${qs}` : ""}`,
    { auth: false }
  );
}

export async function fetchCommunityGroupBySlugApi(slug: string) {
  if (!isCommunityGroupsApiOn()) return null;
  return communityFetch<{ data: Record<string, unknown> }>(
    `/api/community/groups/${encodeURIComponent(slug)}`,
    { auth: false }
  );
}

export async function joinCommunityGroupApi(slug: string) {
  if (!isCommunityGroupsApiOn()) return null;
  return communityFetch<{ data: Record<string, unknown> }>(
    `/api/community/groups/${encodeURIComponent(slug)}/join`,
    { method: "POST" }
  );
}

export async function leaveCommunityGroupApi(slug: string) {
  if (!isCommunityGroupsApiOn()) return null;
  return communityFetch<{ data: Record<string, unknown> }>(
    `/api/community/groups/${encodeURIComponent(slug)}/join`,
    { method: "DELETE" }
  );
}

export async function fetchBusinessPageApi(slug: string) {
  if (!isCommunityBusinessPagesApiOn()) return null;
  return communityFetch<{
    data: {
      profile: Record<string, unknown>;
      viewer: Record<string, unknown>;
    };
  }>(`/api/community/business/${encodeURIComponent(slug)}`, { auth: false });
}

export async function fetchBusinessFeedApi(slug: string) {
  if (!isCommunityBusinessPagesApiOn()) return null;
  return communityFetch<{ data: unknown[]; next_cursor: string | null }>(
    `/api/community/business/${encodeURIComponent(slug)}/feed`,
    { auth: false }
  );
}
