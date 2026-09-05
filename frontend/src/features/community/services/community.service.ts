import { extractHashtags } from "../lib/hashtags";
import {
  addCommunityCommentApi,
  createCommunityPostApi,
  deleteCommunityPostApi,
  fetchCommunityCommentsApi,
  fetchCommunityDiscoverApi,
  fetchCommunityFeed as fetchCommunityFeedApi,
  fetchCommunityGroupBySlugApi,
  fetchCommunityGroupsApi,
  fetchCommunityPost as fetchCommunityPostApi,
  fetchDealerIdBySlugApi,
  fetchFollowersApi,
  fetchFollowingApi,
  fetchSavedPostsApi,
  followUserApi,
  likeCommunityPostApi,
  reportCommunityApi,
  saveCommunityPostApi,
  shareCommunityPostApi,
  unfollowUserApi,
} from "./community-api.service";
import { fetchNotificationsListApi, markNotificationReadApi } from "@/integrations/api/unified-notifications";
import type {
  CommunityComment,
  CommunityGroup,
  CommunityPost,
  CommunityPostKind,
  HashtagTrend,
  ModerationFlag,
  ModerationStatus,
} from "../types";

function mediaUrls(media: unknown): string[] {
  if (!Array.isArray(media)) return [];
  return media
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "url" in item) return String((item as { url: string }).url);
      return "";
    })
    .filter(Boolean);
}

export function mapApiPost(row: Record<string, unknown>): CommunityPost {
  const author = (row.author as Record<string, unknown> | null) ?? null;
  const content = String(row.content ?? row.body ?? "");
  return {
    id: String(row.id),
    authorId: String(row.author_id ?? author?.id ?? ""),
    authorName: author?.display_name != null ? String(author.display_name) : undefined,
    authorAvatar: author?.avatar_url != null ? String(author.avatar_url) : null,
    body: content,
    mediaUrls: mediaUrls(row.media ?? row.media_urls),
    vehicleId: row.vehicle_id != null ? String(row.vehicle_id) : null,
    dealerId: row.dealer_id != null ? String(row.dealer_id) : null,
    groupId: row.group_id != null ? String(row.group_id) : null,
    postKind: (row.post_kind as CommunityPostKind) || "discussion",
    embedProvider: (row.embed_provider as CommunityPost["embedProvider"]) ?? null,
    embedUrl: row.embed_url != null ? String(row.embed_url) : null,
    pollOptions: Array.isArray(row.poll_options) ? (row.poll_options as string[]) : null,
    pollEndsAt: row.poll_ends_at != null ? String(row.poll_ends_at) : null,
    likeCount: Number(row.like_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    shareCount: Number(row.share_count ?? 0),
    spamScore: Number(row.spam_score ?? 0),
    moderationStatus: (row.moderation_status as ModerationStatus) || "approved",
    needsReview: Boolean(row.needs_review),
    hashtags: extractHashtags(content),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    likedByMe: row.liked_by_me != null ? Boolean(row.liked_by_me) : undefined,
    savedByMe: row.saved_by_me != null ? Boolean(row.saved_by_me) : undefined,
  };
}

function mapGroupRow(r: Record<string, unknown>): CommunityGroup {
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    groupType: (r.group_type ?? r.groupType) as CommunityGroup["groupType"],
    ruleKey: (r.rule_key as string) ?? null,
    ruleValue: (r.rule_value as string) ?? null,
    dealerId: (r.dealer_id as string) ?? null,
    coverUrl: (r.cover_url as string) ?? null,
    memberCount: Number(r.member_count ?? 0),
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

export async function fetchCommunityGroups(): Promise<CommunityGroup[]> {
  const api = await fetchCommunityGroupsApi();
  return (api?.data ?? []).map(mapGroupRow);
}

export async function fetchCommunityGroupBySlug(slug: string): Promise<CommunityGroup | null> {
  const api = await fetchCommunityGroupBySlugApi(slug);
  if (api?.data) return mapGroupRow(api.data);
  return null;
}

export async function fetchCommunityFeed(filters?: {
  hashtag?: string;
  groupSlug?: string;
  dealerId?: string;
  vehicleOnly?: boolean;
  authorId?: string;
  followingOnly?: boolean;
  limit?: number;
  currentUserId?: string | null;
}): Promise<CommunityPost[]> {
  const api = await fetchCommunityFeedApi({
    type: filters?.followingOnly ? "following" : filters?.groupSlug ? "group" : "global",
    limit: filters?.limit ?? 40,
    group_slug: filters?.groupSlug,
    dealer_id: filters?.dealerId,
    author_id: filters?.authorId,
    vehicle_only: filters?.vehicleOnly,
  });
  let list = (api?.data ?? []).map((row) => mapApiPost(row as Record<string, unknown>));
  if (filters?.hashtag) {
    const h = filters.hashtag.toLowerCase();
    list = list.filter((p) => p.hashtags.includes(h) || p.body.toLowerCase().includes(`#${h}`));
  }
  return list;
}

export async function fetchCommunityPost(postId: string, _currentUserId?: string | null): Promise<CommunityPost | null> {
  const api = await fetchCommunityPostApi(postId);
  if (!api?.data) return null;
  return mapApiPost(api.data);
}

export async function fetchComments(postId: string): Promise<CommunityComment[]> {
  const api = await fetchCommunityCommentsApi(postId);
  return (api?.data ?? []).map((r) => ({
    id: String(r.id),
    postId: String(r.post_id ?? postId),
    authorId: String(r.user_id ?? ""),
    authorName:
      r.author && typeof r.author === "object"
        ? String((r.author as { display_name?: string }).display_name ?? "Member")
        : "Member",
    body: String(r.content ?? ""),
    spamScore: 0,
    hidden: false,
    createdAt: String(r.created_at ?? new Date().toISOString()),
  }));
}

export async function createCommunityPost(input: {
  authorId: string;
  authorName?: string;
  body: string;
  mediaUrls?: string[];
  postKind?: CommunityPostKind;
  groupId?: string | null;
  dealerId?: string | null;
  vehicleId?: string | null;
  embedUrl?: string | null;
  pollOptions?: string[] | null;
}): Promise<CommunityPost> {
  const created = await createCommunityPostApi({
    content: input.body,
    media: input.mediaUrls ?? [],
    post_kind: input.postKind,
    group_id: input.groupId ?? null,
    dealer_id: input.dealerId ?? null,
    vehicle_id: input.vehicleId ?? null,
    embed_url: input.embedUrl ?? null,
    poll_options: input.pollOptions ?? null,
  });
  return mapApiPost(created.data);
}

export async function deleteCommunityPost(postId: string, _userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteCommunityPostApi(postId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete" };
  }
}

export async function togglePostLike(postId: string, _userId: string, currentlyLiked: boolean): Promise<void> {
  await likeCommunityPostApi(postId, currentlyLiked);
}

export async function addPostComment(postId: string, _userId: string, body: string, _authorName?: string): Promise<void> {
  await addCommunityCommentApi(postId, body);
}

export async function sharePost(postId: string, _userId: string): Promise<void> {
  await shareCommunityPostApi(postId);
}

export async function savePost(postId: string, currentlySaved: boolean): Promise<void> {
  await saveCommunityPostApi(postId, currentlySaved);
}

export async function fetchSavedPosts(): Promise<CommunityPost[]> {
  const api = await fetchSavedPostsApi();
  return (api?.data ?? []).map((row) => mapApiPost(row as Record<string, unknown>));
}

export async function votePoll(_postId: string, _userId: string, _optionIndex: number): Promise<void> {
  return;
}

export async function getPollVote(_postId: string, _userId: string): Promise<number | null> {
  return null;
}

export async function followUser(_followerId: string, followingId: string): Promise<void> {
  await followUserApi(followingId);
}

export async function unfollowUser(_followerId: string, followingId: string): Promise<void> {
  await unfollowUserApi(followingId);
}

export async function isFollowing(_followerId: string, followingId: string): Promise<boolean> {
  const list = await fetchFollowingApi(_followerId);
  return (list?.data ?? []).some((row) => String(row.user_id) === followingId);
}

export async function flagPost(input: {
  postId: string;
  reporterId: string;
  reason: string;
  aiSpamScore?: number;
}): Promise<void> {
  await reportCommunityApi({
    target_type: "post",
    target_id: input.postId,
    reason: input.reason,
  });
}

export function computeTrendingHashtags(posts: CommunityPost[], limit = 10): HashtagTrend[] {
  const m = new Map<string, number>();
  for (const p of posts) {
    for (const h of p.hashtags ?? []) {
      m.set(h, (m.get(h) ?? 0) + 1);
    }
  }
  return [...m.entries()]
    .map(([hashtag, count]) => ({ hashtag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function fetchDealerIdBySlug(slug: string): Promise<string | null> {
  const api = await fetchDealerIdBySlugApi(slug);
  return api?.data?.dealer_id ?? null;
}

export async function fetchCommunityDiscover(params?: {
  q?: string;
  city?: string;
  profile_type?: string;
  kind?: string;
}) {
  const api = await fetchCommunityDiscoverApi(params);
  return api?.data ?? { people: [], dealers: [], businesses: [] };
}

export async function fetchFollowers(userId: string) {
  return (await fetchFollowersApi(userId))?.data ?? [];
}

export async function fetchFollowing(userId: string) {
  return (await fetchFollowingApi(userId))?.data ?? [];
}

export async function fetchCommunityNotifications(_userId: string): Promise<
  { id: string; title: string; message: string; type: string; link: string | null; isRead: boolean; createdAt: string }[]
> {
  try {
    const result = await fetchNotificationsListApi({ source: "community" });
    return (result?.items ?? []).map((n) => ({
      id: n.native_id ?? n.id,
      title: n.title,
      message: n.body,
      type: "community",
      link: n.deep_link ?? "/community",
      isRead: n.is_read,
      createdAt: n.created_at,
    }));
  } catch {
    return [];
  }
}

export async function markNotificationRead(id: string, _userId: string): Promise<void> {
  const unifiedId = id.includes(":") ? id : `community:${id}`;
  await markNotificationReadApi(unifiedId);
}

export async function fetchModerationQueue(): Promise<{ posts: CommunityPost[]; flags: ModerationFlag[] }> {
  return { posts: [], flags: [] };
}

export async function moderatePost(_postId: string, _status: ModerationStatus, _needsReview?: boolean): Promise<void> {
  return;
}

export async function resolveFlag(_flagId: string, _status: "dismissed" | "action_taken"): Promise<void> {
  return;
}



