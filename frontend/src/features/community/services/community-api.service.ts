/**
 * REST client for Batch 6 community APIs. Dedicated /api/community/* only — not /api/db/query.
 */
import { featureFlags } from "@/config/feature-flags";
import { hasConfiguredApi, joinApiUrl } from "@/lib/api/base-url";
import { fetchWithTimeout } from "@/lib/api/with-timeout";
import { getAccessToken } from "@/lib/api/axios";

function communityApiEnabled(): boolean {
  return featureFlags.communityV2 && hasConfiguredApi();
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    if (body?.message) return body.message;
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

async function communityRequest<T>(
  path: string,
  init?: RequestInit & { auth?: boolean }
): Promise<T> {
  if (!communityApiEnabled()) throw new Error("Community API is not configured");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.auth !== false) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetchWithTimeout(joinApiUrl(path), { ...init, headers }, 8000);
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

async function communityFetch<T>(
  path: string,
  init?: RequestInit & { auth?: boolean }
): Promise<T | null> {
  try {
    return await communityRequest<T>(path, init);
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

export function isCommunityFollowApiOn() {
  return communityApiEnabled() && featureFlags.communityFollow;
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

export async function fetchMyCommunityProfile() {
  if (!isCommunityProfilesApiOn()) return null;
  return communityFetch<{ data: Record<string, unknown> }>("/api/community/profile/me");
}

export async function patchMyCommunityProfile(body: Record<string, unknown>) {
  return communityRequest<{ data: Record<string, unknown> }>("/api/community/profile/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function fetchCommunityProfileByHandle(handle: string) {
  if (!isCommunityProfilesApiOn()) return null;
  return communityFetch<{ data: Record<string, unknown> }>(
    `/api/community/profile/${encodeURIComponent(handle)}`
  );
}

export async function fetchCommunityProfileByUserId(userId: string) {
  if (!isCommunityProfilesApiOn()) return null;
  return communityFetch<{ data: Record<string, unknown> }>(
    `/api/community/profile/user/${encodeURIComponent(userId)}`
  );
}

export async function fetchCommunityFeed(params: {
  type?: string;
  cursor?: string;
  limit?: number;
  handle?: string;
  business_slug?: string;
  group_slug?: string;
  dealer_id?: string;
  author_id?: string;
  vehicle_only?: boolean;
}) {
  if (!isCommunityFeedApiOn()) return null;
  const q = new URLSearchParams();
  if (params.type) q.set("type", params.type);
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.limit) q.set("limit", String(params.limit));
  if (params.handle) q.set("handle", params.handle);
  if (params.business_slug) q.set("business_slug", params.business_slug);
  if (params.group_slug) q.set("group_slug", params.group_slug);
  if (params.dealer_id) q.set("dealer_id", params.dealer_id);
  if (params.author_id) q.set("author_id", params.author_id);
  if (params.vehicle_only) q.set("vehicle_only", "1");
  const qs = q.toString();
  return communityFetch<{ data: unknown[]; next_cursor: string | null }>(
    `/api/community/feed${qs ? `?${qs}` : ""}`
  );
}

export async function fetchCommunityPost(id: string) {
  if (!isCommunityPostsApiOn()) return null;
  return communityFetch<{ data: Record<string, unknown> }>(
    `/api/community/posts/${encodeURIComponent(id)}`
  );
}

export async function createCommunityPostApi(body: Record<string, unknown>) {
  return communityRequest<{ data: Record<string, unknown> }>("/api/community/posts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchCommunityPostApi(id: string, body: Record<string, unknown>) {
  return communityRequest<{ data: Record<string, unknown> }>(
    `/api/community/posts/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

export async function deleteCommunityPostApi(id: string) {
  return communityRequest<{ data: { deleted: boolean } }>(
    `/api/community/posts/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

export async function likeCommunityPostApi(id: string, liked: boolean) {
  return communityRequest<{ data: { liked: boolean; like_count: number } }>(
    `/api/community/posts/${encodeURIComponent(id)}/like`,
    { method: liked ? "DELETE" : "POST" }
  );
}

export async function fetchCommunityCommentsApi(id: string) {
  return communityFetch<{ data: Record<string, unknown>[] }>(
    `/api/community/posts/${encodeURIComponent(id)}/comments`
  );
}

export async function addCommunityCommentApi(id: string, content: string) {
  return communityRequest<{ data: Record<string, unknown> }>(
    `/api/community/posts/${encodeURIComponent(id)}/comments`,
    { method: "POST", body: JSON.stringify({ content }) }
  );
}

export async function shareCommunityPostApi(id: string) {
  return communityRequest<{ data: { share_count: number; channel: string } }>(
    `/api/community/posts/${encodeURIComponent(id)}/share`,
    { method: "POST" }
  );
}

export async function saveCommunityPostApi(id: string, saved: boolean) {
  return communityRequest<{ data: { saved: boolean } }>(
    `/api/community/posts/${encodeURIComponent(id)}/save`,
    { method: saved ? "DELETE" : "POST" }
  );
}

export async function fetchSavedPostsApi() {
  return communityFetch<{ data: unknown[]; next_cursor: string | null }>("/api/community/saved");
}

export async function followUserApi(userId: string) {
  return communityRequest<{ data: { followed: boolean } }>(
    `/api/community/follow/${encodeURIComponent(userId)}`,
    { method: "POST" }
  );
}

export async function unfollowUserApi(userId: string) {
  return communityRequest<{ data: { unfollowed: boolean } }>(
    `/api/community/follow/${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );
}

export async function fetchFollowersApi(userId?: string) {
  const q = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return communityFetch<{ data: Record<string, unknown>[] }>(`/api/community/followers${q}`);
}

export async function fetchFollowingApi(userId?: string) {
  const q = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return communityFetch<{ data: Record<string, unknown>[] }>(`/api/community/following${q}`);
}

export async function fetchCommunityDiscoverApi(params?: {
  q?: string;
  city?: string;
  profile_type?: string;
  kind?: string;
}) {
  const q = new URLSearchParams();
  if (params?.q) q.set("q", params.q);
  if (params?.city) q.set("city", params.city);
  if (params?.profile_type) q.set("profile_type", params.profile_type);
  if (params?.kind) q.set("kind", params.kind);
  const qs = q.toString();
  return communityFetch<{
    data: {
      people: Record<string, unknown>[];
      dealers: Record<string, unknown>[];
      businesses: Record<string, unknown>[];
    };
  }>(`/api/community/discover${qs ? `?${qs}` : ""}`);
}

export async function fetchDealerIdBySlugApi(slug: string) {
  return communityFetch<{ data: { dealer_id: string | null } }>(
    `/api/community/discover?dealer_slug=${encodeURIComponent(slug)}`
  );
}

export async function reportCommunityApi(body: {
  target_type: string;
  target_id: string;
  reason: string;
  details?: string;
}) {
  return communityRequest<{ data: Record<string, unknown> }>("/api/community/reports", {
    method: "POST",
    body: JSON.stringify(body),
  });
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
    `/api/community/groups${qs ? `?${qs}` : ""}`
  );
}

export async function fetchCommunityGroupBySlugApi(slug: string) {
  if (!isCommunityGroupsApiOn()) return null;
  return communityFetch<{ data: Record<string, unknown> }>(
    `/api/community/groups/${encodeURIComponent(slug)}`
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
  }>(`/api/community/business/${encodeURIComponent(slug)}`);
}

export async function fetchBusinessFeedApi(slug: string) {
  if (!isCommunityBusinessPagesApiOn()) return null;
  return communityFetch<{ data: unknown[]; next_cursor: string | null }>(
    `/api/community/business/${encodeURIComponent(slug)}/feed`
  );
}
