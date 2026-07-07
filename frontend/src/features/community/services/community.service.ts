import { supabase } from "@/integrations/supabase/client";
import { extractHashtags } from "../lib/hashtags";
import { scoreSpamContent, shouldQueueForReview } from "../lib/spam-detection";
import { detectEmbedProvider } from "../lib/embed-utils";
import { enrichAuthors, fetchFollowingUserIds } from "./community-profile.service";
import {
  COMMUNITY_POST_IMAGES,
  MEDIA_DEFAULTS,
  getModelImages,
} from "@/lib/media/india-media-catalog";
import { featureFlags } from "@/config/feature-flags";
import {
  fetchCommunityGroupBySlugApi,
  fetchCommunityGroupsApi,
} from "./community-api.service";
import type {
  CommunityComment,
  CommunityGroup,
  CommunityPost,
  CommunityPostKind,
  HashtagTrend,
  ModerationFlag,
  ModerationStatus,
} from "../types";

const LS_POSTS = "motorcart_community_posts_v1";
const LS_FLAGS = "motorcart_community_flags_v1";
const LS_COMMENTS = "motorcart_community_comments_v1";
const LS_LIKE_DELTA = "motorcart_community_like_delta_v1";
const LS_SHARE_DELTA = "motorcart_community_share_delta_v1";

function likeKey(userId: string) {
  return `motorcart_community_liked_${userId}`;
}

function readLs<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const r = localStorage.getItem(key);
    return r ? (JSON.parse(r) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLs(key: string, val: unknown) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
}

const MOCK_GROUPS: CommunityGroup[] = [
  {
    id: "g-blr",
    slug: "bangalore-drivers",
    name: "Bangalore drivers",
    description: "City meetups, tips & drives",
    groupType: "city",
    ruleKey: "city",
    ruleValue: "Bangalore",
    dealerId: null,
    coverUrl: COMMUNITY_POST_IMAGES.roadTrip,
    memberCount: 12800,
    createdAt: new Date().toISOString(),
  },
  {
    id: "g-ev",
    slug: "ev-owners-india",
    name: "EV owners India",
    description: "Range, charging & policy",
    groupType: "vehicle_topic",
    ruleKey: "topic",
    ruleValue: "ev",
    dealerId: null,
    coverUrl: COMMUNITY_POST_IMAGES.ev,
    memberCount: 9400,
    createdAt: new Date().toISOString(),
  },
  {
    id: "g-tr",
    slug: "motorcart-trending",
    name: "Trending on Motorcart",
    description: "Hot posts this week",
    groupType: "trending",
    ruleKey: null,
    ruleValue: null,
    dealerId: null,
    coverUrl: MEDIA_DEFAULTS.communityCover,
    memberCount: 50000,
    createdAt: new Date().toISOString(),
  },
];

const MOCK_AUTHOR = "Community member";

const MOCK_POSTS: CommunityPost[] = [
  {
    id: "mp-1",
    authorId: "00000000-0000-0000-0000-000000000099",
    authorName: "Priya K",
    body: "Weekend Western Ghats run — #mile munching with the new #suv. What's your favourite stretch?",
    mediaUrls: [COMMUNITY_POST_IMAGES.roadTrip],
    vehicleId: null,
    dealerId: null,
    groupId: "g-blr",
    groupSlug: "bangalore-drivers",
    postKind: "discussion",
    embedProvider: null,
    embedUrl: null,
    pollOptions: null,
    pollEndsAt: null,
    likeCount: 142,
    commentCount: 18,
    shareCount: 6,
    spamScore: 0.05,
    moderationStatus: "approved",
    needsReview: false,
    hashtags: ["mile", "suv"],
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: "mp-2",
    authorId: "00000000-0000-0000-0000-000000000098",
    authorName: "Rahul EV",
    body: "Charging curve after 80% — worth staying or unplug? #ev #charging",
    mediaUrls: [],
    vehicleId: null,
    dealerId: null,
    groupId: "g-ev",
    groupSlug: "ev-owners-india",
    postKind: "discussion",
    embedProvider: null,
    embedUrl: null,
    pollOptions: null,
    pollEndsAt: null,
    likeCount: 89,
    commentCount: 31,
    shareCount: 12,
    spamScore: 0.08,
    moderationStatus: "approved",
    needsReview: false,
    hashtags: ["ev", "charging"],
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
  },
  {
    id: "mp-3",
    authorId: "00000000-0000-0000-0000-000000000097",
    authorName: "Motorcart Studios",
    body: "POV: ceramic coating after monsoon — reel linked below.",
    mediaUrls: [],
    vehicleId: null,
    dealerId: null,
    groupId: null,
    groupSlug: null,
    postKind: "embed",
    embedProvider: "reel",
    embedUrl: "https://www.instagram.com/reel/example",
    pollOptions: null,
    pollEndsAt: null,
    likeCount: 256,
    commentCount: 14,
    shareCount: 44,
    spamScore: 0.04,
    moderationStatus: "approved",
    needsReview: false,
    hashtags: ["detailing"],
    createdAt: new Date(Date.now() - 86400_000).toISOString(),
  },
  {
    id: "mp-4",
    authorId: "00000000-0000-0000-0000-000000000096",
    authorName: "Ananya",
    body: "",
    mediaUrls: [],
    vehicleId: null,
    dealerId: null,
    groupId: null,
    groupSlug: null,
    postKind: "poll",
    embedProvider: null,
    embedUrl: null,
    pollOptions: ["SUV under 20L", "Sedan comfort", "Hot hatch fun"],
    pollEndsAt: new Date(Date.now() + 3 * 86400_000).toISOString(),
    likeCount: 64,
    commentCount: 22,
    shareCount: 3,
    spamScore: 0.02,
    moderationStatus: "approved",
    needsReview: false,
    hashtags: ["poll", "buyingadvice"],
    createdAt: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: "mp-5",
    authorId: "00000000-0000-0000-0000-000000000095",
    authorName: "Highway India",
    body: "Highlights from our latest YouTube road review — embedded player:",
    mediaUrls: [],
    vehicleId: null,
    dealerId: null,
    groupId: null,
    groupSlug: null,
    postKind: "embed",
    embedProvider: "youtube",
    embedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    pollOptions: null,
    pollEndsAt: null,
    likeCount: 1200,
    commentCount: 210,
    shareCount: 300,
    spamScore: 0.01,
    moderationStatus: "approved",
    needsReview: false,
    hashtags: ["youtube", "review"],
    createdAt: new Date(Date.now() - 400_000).toISOString(),
  },
  {
    id: "mp-6",
    authorId: "00000000-0000-0000-0000-000000000094",
    authorName: "B2B Auto",
    body: "Long-form on dealer digitisation — LinkedIn article:",
    mediaUrls: [],
    vehicleId: null,
    dealerId: null,
    groupId: null,
    groupSlug: null,
    postKind: "embed",
    embedProvider: "linkedin",
    embedUrl: "https://www.linkedin.com/pulse/example",
    pollOptions: null,
    pollEndsAt: null,
    likeCount: 88,
    commentCount: 6,
    shareCount: 19,
    spamScore: 0.03,
    moderationStatus: "approved",
    needsReview: false,
    hashtags: ["dealer", "linkedin"],
    createdAt: new Date(Date.now() - 200_000).toISOString(),
  },
];

const MOCK_COMMENTS: Record<string, CommunityComment[]> = {
  "mp-1": [
    {
      id: "c1",
      postId: "mp-1",
      authorId: "x",
      authorName: "Vikram",
      body: "NH48 towards Chikmagalur never disappoints.",
      spamScore: 0,
      hidden: false,
      createdAt: new Date().toISOString(),
    },
  ],
};

/** Real posts only: DB + user's local drafts. No demo/mock filler. */
function mergePosts(db: CommunityPost[]): CommunityPost[] {
  const local = readLs<CommunityPost[]>(LS_POSTS, []);
  const seen = new Set(db.map((p) => p.id));
  return [...db, ...local.filter((p) => !seen.has(p.id))].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
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

function mapPostRow(r: Record<string, unknown>, extras?: Partial<CommunityPost>): CommunityPost {
  const poll = r.poll_options as string[] | null;
  return {
    id: r.id as string,
    authorId: r.author_id as string,
    body: (r.body as string) ?? "",
    mediaUrls: (r.media_urls as string[]) ?? [],
    vehicleId: (r.vehicle_id as string) ?? null,
    dealerId: (r.dealer_id as string) ?? null,
    groupId: (r.group_id as string) ?? null,
    postKind: r.post_kind as CommunityPost["postKind"],
    embedProvider: (r.embed_provider as CommunityPost["embedProvider"]) ?? null,
    embedUrl: (r.embed_url as string) ?? null,
    pollOptions: Array.isArray(poll) ? poll : poll ? JSON.parse(JSON.stringify(poll)) : null,
    pollEndsAt: (r.poll_ends_at as string) ?? null,
    likeCount: Number(r.like_count ?? 0),
    commentCount: Number(r.comment_count ?? 0),
    shareCount: Number(r.share_count ?? 0),
    spamScore: Number(r.spam_score ?? 0),
    moderationStatus: r.moderation_status as ModerationStatus,
    needsReview: Boolean(r.needs_review),
    hashtags: [],
    createdAt: r.created_at as string,
    ...extras,
  };
}

export async function fetchCommunityGroups(): Promise<CommunityGroup[]> {
  if (featureFlags.communityV2 && featureFlags.communityGroups) {
    const api = await fetchCommunityGroupsApi();
    if (api?.data?.length) return api.data.map(mapGroupRow);
  }
  const { data, error } = await supabase.from("community_groups").select("*").order("member_count", { ascending: false });
  if (!error && data?.length) return (data as Record<string, unknown>[]).map(mapGroupRow);
  return MOCK_GROUPS;
}

export async function fetchCommunityGroupBySlug(slug: string): Promise<CommunityGroup | null> {
  if (featureFlags.communityV2 && featureFlags.communityGroups) {
    const api = await fetchCommunityGroupBySlugApi(slug);
    if (api?.data) return mapGroupRow(api.data);
  }
  const { data, error } = await supabase.from("community_groups").select("*").eq("slug", slug).maybeSingle();
  if (!error && data) return mapGroupRow(data as Record<string, unknown>);
  return MOCK_GROUPS.find((g) => g.slug === slug) ?? null;
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
  let q = supabase
    .from("social_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 40);

  if (filters?.dealerId) q = q.eq("dealer_id", filters.dealerId);
  if (filters?.authorId) q = q.eq("author_id", filters.authorId);
  if (filters?.vehicleOnly) q = q.not("vehicle_id", "is", null);

  let groupId: string | null = null;
  if (filters?.groupSlug) {
    const g = await fetchCommunityGroupBySlug(filters.groupSlug);
    groupId = g?.id ?? null;
    if (groupId) q = q.eq("group_id", groupId);
  }

  const { data, error } = await q;
  let list: CommunityPost[] = [];
  if (!error && data?.length) {
    for (const row of data as Record<string, unknown>[]) {
      const p = mapPostRow(row);
      const { data: tags } = await supabase.from("post_hashtags").select("hashtag").eq("post_id", p.id);
      p.hashtags = (tags as { hashtag: string }[] | null)?.map((t) => t.hashtag) ?? extractHashtags(p.body);
      if (filters?.currentUserId) {
        const { data: lk } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("post_id", p.id)
          .eq("user_id", filters.currentUserId)
          .maybeSingle();
        p.likedByMe = !!lk;
      }
      list.push(p);
    }
  }

  list = mergePosts(list);

  if (filters?.groupSlug && !groupId) {
    list = list.filter((p) => p.groupSlug === filters.groupSlug);
  }
  if (filters?.hashtag) {
    const h = filters.hashtag.toLowerCase();
    list = list.filter((p) => p.hashtags.includes(h) || p.body.toLowerCase().includes(`#${h}`));
  }
  if (filters?.authorId) {
    list = list.filter((p) => p.authorId === filters.authorId);
  }
  if (filters?.vehicleOnly) {
    list = list.filter((p) => p.vehicleId);
  }
  if (filters?.dealerId) {
    list = list.filter((p) => p.dealerId === filters.dealerId);
  }

  if (filters?.followingOnly && filters?.currentUserId) {
    const followingIds = await fetchFollowingUserIds(filters.currentUserId);
    const allowed = new Set([...followingIds, filters.currentUserId]);
    list = list.filter((p) => allowed.has(p.authorId));
  }

  for (const p of list) {
    if (!p.hashtags?.length) p.hashtags = extractHashtags(p.body);
    if (!p.authorName) p.authorName = MOCK_AUTHOR;
    const ld = readLs<Record<string, number>>(LS_LIKE_DELTA, {});
    const sd = readLs<Record<string, number>>(LS_SHARE_DELTA, {});
    p.likeCount = Math.max(0, p.likeCount + (ld[p.id] ?? 0));
    p.shareCount = Math.max(0, p.shareCount + (sd[p.id] ?? 0));
    if (filters?.currentUserId) {
      const likedMap = readLs<Record<string, boolean>>(likeKey(filters.currentUserId), {});
      if (likedMap[p.id] !== undefined) p.likedByMe = likedMap[p.id];
    }
  }

  list = await enrichAuthors(list);
  return list.slice(0, filters?.limit ?? 40);
}

function isDemoPostId(id: string) {
  return id.startsWith("mp-");
}

export async function fetchCommunityPost(postId: string, currentUserId?: string | null): Promise<CommunityPost | null> {
  const { data, error } = await supabase.from("social_posts").select("*").eq("id", postId).maybeSingle();
  let p: CommunityPost | null = null;
  if (!error && data) {
    p = mapPostRow(data as Record<string, unknown>);
    const { data: tags } = await supabase.from("post_hashtags").select("hashtag").eq("post_id", p.id);
    p.hashtags = (tags as { hashtag: string }[] | null)?.map((t) => t.hashtag) ?? extractHashtags(p.body);
    if (currentUserId) {
      const { data: lk } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("post_id", p.id)
        .eq("user_id", currentUserId)
        .maybeSingle();
      p.likedByMe = !!lk;
    }
  }
  if (!p) {
    p = readLs<CommunityPost[]>(LS_POSTS, []).find((x) => x.id === postId) ?? null;
  }
  if (p && !p.authorName) p.authorName = MOCK_AUTHOR;
  if (p) {
    const ld = readLs<Record<string, number>>(LS_LIKE_DELTA, {});
    const sd = readLs<Record<string, number>>(LS_SHARE_DELTA, {});
    p.likeCount = Math.max(0, p.likeCount + (ld[p.id] ?? 0));
    p.shareCount = Math.max(0, p.shareCount + (sd[p.id] ?? 0));
    if (currentUserId) {
      const likedMap = readLs<Record<string, boolean>>(likeKey(currentUserId), {});
      if (likedMap[p.id] !== undefined) p.likedByMe = likedMap[p.id];
    }
  }
  return p;
}

export async function fetchComments(postId: string): Promise<CommunityComment[]> {
  const allExtra = readLs<Record<string, CommunityComment[]>>(LS_COMMENTS, {});
  const extra = allExtra[postId] ?? [];
  const { data, error } = await supabase
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (!error && data?.length) {
    const fromDb = (data as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      postId: r.post_id as string,
      authorId: r.author_id as string,
      body: r.body as string,
      spamScore: Number(r.spam_score ?? 0),
      hidden: Boolean(r.hidden),
      createdAt: r.created_at as string,
      authorName: MOCK_AUTHOR,
    }));
    return [...fromDb, ...extra].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  return [...(MOCK_COMMENTS[postId] ?? []), ...extra].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
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
  const spam = scoreSpamContent(`${input.body} ${(input.pollOptions ?? []).join(" ")}`);
  const needs = shouldQueueForReview(spam);
  const moderation: ModerationStatus = needs ? "pending" : "approved";
  const hashtags = extractHashtags(input.body);
  const embedUrl = input.embedUrl ?? null;
  const embedProvider = embedUrl ? detectEmbedProvider(embedUrl) : null;
  const mediaUrls = input.mediaUrls ?? [];
  const postKind =
    input.postKind ??
    (input.pollOptions?.length ? "poll" : embedUrl ? "embed" : mediaUrls.length ? "discussion" : "discussion");

  const row = {
    author_id: input.authorId,
    body: input.body,
    media_urls: mediaUrls,
    vehicle_id: input.vehicleId ?? null,
    dealer_id: input.dealerId ?? null,
    group_id: input.groupId ?? null,
    post_kind: postKind,
    embed_provider: embedProvider,
    embed_url: embedUrl,
    poll_options: input.pollOptions?.length ? input.pollOptions : null,
    poll_ends_at: input.pollOptions?.length ? new Date(Date.now() + 7 * 86400_000).toISOString() : null,
    spam_score: spam,
    moderation_status: moderation,
    needs_review: needs,
  };

  const { data, error } = await supabase.from("social_posts").insert(row).select("*").single();
  if (!error && data) {
    const p = mapPostRow(data as Record<string, unknown>, { authorName: input.authorName, hashtags });
    for (const h of hashtags) {
      await supabase.from("post_hashtags").insert({ post_id: p.id, hashtag: h });
    }
    return p;
  }

  const g = input.groupId ? MOCK_GROUPS.find((x) => x.id === input.groupId) : null;
  const fallback: CommunityPost = {
    id: crypto.randomUUID(),
    authorId: input.authorId,
    authorName: input.authorName ?? "You",
    body: input.body,
    mediaUrls: mediaUrls,
    vehicleId: input.vehicleId ?? null,
    dealerId: input.dealerId ?? null,
    groupId: input.groupId ?? null,
    groupSlug: g?.slug ?? null,
    postKind,
    embedProvider,
    embedUrl,
    pollOptions: input.pollOptions ?? null,
    pollEndsAt: input.pollOptions?.length ? new Date(Date.now() + 7 * 86400_000).toISOString() : null,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    spamScore: spam,
    moderationStatus: moderation,
    needsReview: needs,
    hashtags,
    createdAt: new Date().toISOString(),
  };
  const all = readLs<CommunityPost[]>(LS_POSTS, []);
  all.unshift(fallback);
  writeLs(LS_POSTS, all);
  return fallback;
}

export async function deleteCommunityPost(
  postId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  if (isDemoPostId(postId)) {
    return { ok: false, error: "Demo posts cannot be deleted." };
  }

  const local = readLs<CommunityPost[]>(LS_POSTS, []);
  const localIdx = local.findIndex((p) => p.id === postId && p.authorId === userId);
  if (localIdx >= 0) {
    local.splice(localIdx, 1);
    writeLs(LS_POSTS, local);
    return { ok: true };
  }

  const { error } = await supabase
    .from("social_posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function togglePostLike(postId: string, userId: string, currentlyLiked: boolean): Promise<void> {
  if (isDemoPostId(postId)) {
    const liked = readLs<Record<string, boolean>>(likeKey(userId), {});
    liked[postId] = !currentlyLiked;
    writeLs(likeKey(userId), liked);
    const d = readLs<Record<string, number>>(LS_LIKE_DELTA, {});
    d[postId] = (d[postId] ?? 0) + (currentlyLiked ? -1 : 1);
    writeLs(LS_LIKE_DELTA, d);
    return;
  }
  if (currentlyLiked) {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
    void supabase.rpc("community_notify_post_like", { p_post_id: postId });
  }
  const { count } = await supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", postId);
  await supabase.from("social_posts").update({ like_count: count ?? 0 }).eq("id", postId);

  const local = readLs<CommunityPost[]>(LS_POSTS, []);
  const i = local.findIndex((p) => p.id === postId);
  if (i >= 0) {
    local[i].likeCount = Math.max(0, (local[i].likeCount ?? 0) + (currentlyLiked ? -1 : 1));
    writeLs(LS_POSTS, local);
  }
}

export async function addPostComment(postId: string, authorId: string, body: string, authorName?: string): Promise<void> {
  const spam = scoreSpamContent(body);
  const hidden = spam >= 0.85;
  const pushLocal = () => {
    const all = readLs<Record<string, CommunityComment[]>>(LS_COMMENTS, {});
    const list = all[postId] ?? [];
    list.push({
      id: crypto.randomUUID(),
      postId,
      authorId,
      authorName: authorName ?? "You",
      body,
      spamScore: spam,
      hidden,
      createdAt: new Date().toISOString(),
    });
    all[postId] = list;
    writeLs(LS_COMMENTS, all);
  };
  if (isDemoPostId(postId)) {
    pushLocal();
    return;
  }
  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,
    author_id: authorId,
    body,
    spam_score: spam,
    hidden,
  });
  if (error) {
    pushLocal();
    return;
  }
    void supabase.rpc("community_notify_post_comment", { p_post_id: postId, p_preview: body });
  const { count } = await supabase.from("post_comments").select("*", { count: "exact", head: true }).eq("post_id", postId);
  await supabase.from("social_posts").update({ comment_count: count ?? 0 }).eq("id", postId);
}

export async function sharePost(postId: string, userId: string): Promise<void> {
  if (isDemoPostId(postId)) {
    const d = readLs<Record<string, number>>(LS_SHARE_DELTA, {});
    d[postId] = (d[postId] ?? 0) + 1;
    writeLs(LS_SHARE_DELTA, d);
    return;
  }
  await supabase.from("post_shares").insert({ post_id: postId, user_id: userId });
  const { data: row } = await supabase.from("social_posts").select("share_count").eq("id", postId).maybeSingle();
  const n = Number((row as { share_count: number } | null)?.share_count ?? 0) + 1;
  await supabase.from("social_posts").update({ share_count: n }).eq("id", postId);
}

const LS_POLL = "motorcart_community_poll_votes_v1";

export async function votePoll(postId: string, userId: string, optionIndex: number): Promise<void> {
  const { error } = await supabase.from("poll_votes").upsert(
    { post_id: postId, user_id: userId, option_index: optionIndex },
    { onConflict: "post_id,user_id" }
  );
  if (error) {
    const all = readLs<Record<string, Record<string, number>>>(LS_POLL, {});
    const byPost = all[postId] ?? {};
    byPost[userId] = optionIndex;
    all[postId] = byPost;
    writeLs(LS_POLL, all);
  }
}

export async function getPollVote(postId: string, userId: string): Promise<number | null> {
  const { data } = await supabase.from("poll_votes").select("option_index").eq("post_id", postId).eq("user_id", userId).maybeSingle();
  if (data) return (data as { option_index: number }).option_index;
  const all = readLs<Record<string, Record<string, number>>>(LS_POLL, {});
  const v = all[postId]?.[userId];
  return v !== undefined ? v : null;
}

export async function followUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase.from("user_follows").insert({ follower_id: followerId, following_id: followingId });
  if (!error) void supabase.rpc("community_notify_new_follower", { p_target: followingId });
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  await supabase.from("user_follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return !!data;
}

export async function flagPost(input: {
  postId: string;
  reporterId: string;
  reason: string;
  aiSpamScore?: number;
}): Promise<void> {
  const score = input.aiSpamScore ?? scoreSpamContent(input.reason);
  const row = {
    post_id: input.postId,
    reporter_id: input.reporterId,
    reason: input.reason,
    ai_spam_score: score,
    status: "open",
  };
  const { error } = await supabase.from("community_moderation_flags").insert(row);
  if (error) {
    const flags = readLs<ModerationFlag[]>(LS_FLAGS, []);
    flags.unshift({
      id: crypto.randomUUID(),
      postId: input.postId,
      reporterId: input.reporterId,
      reason: input.reason,
      aiSpamScore: score,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    writeLs(LS_FLAGS, flags);
  }
}

export async function fetchModerationQueue(): Promise<{ posts: CommunityPost[]; flags: ModerationFlag[] }> {
  const { data: flags } = await supabase
    .from("community_moderation_flags")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  const { data: posts } = await supabase
    .from("social_posts")
    .select("*")
    .or("needs_review.eq.true,moderation_status.eq.pending")
    .order("created_at", { ascending: false })
    .limit(50);

  const flagList: ModerationFlag[] =
    (flags as Record<string, unknown>[] | null)?.map((r) => ({
      id: r.id as string,
      postId: r.post_id as string,
      reporterId: r.reporter_id as string,
      reason: r.reason as string,
      aiSpamScore: r.ai_spam_score != null ? Number(r.ai_spam_score) : null,
      status: r.status as ModerationFlag["status"],
      createdAt: r.created_at as string,
    })) ?? [];

  const postList: CommunityPost[] =
    (posts as Record<string, unknown>[] | null)?.map((r) => mapPostRow(r)) ?? [];
  const localPending = readLs<CommunityPost[]>(LS_POSTS, []).filter(
    (p) => p.needsReview || p.moderationStatus === "pending"
  );

  return {
    posts: [...postList, ...localPending].filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i),
    flags: [...flagList, ...readLs<ModerationFlag[]>(LS_FLAGS, [])],
  };
}

export async function moderatePost(postId: string, status: ModerationStatus, needsReview?: boolean): Promise<void> {
  await supabase
    .from("social_posts")
    .update({ moderation_status: status, needs_review: needsReview ?? false })
    .eq("id", postId);
  const local = readLs<CommunityPost[]>(LS_POSTS, []);
  const i = local.findIndex((p) => p.id === postId);
  if (i >= 0) {
    local[i].moderationStatus = status;
    local[i].needsReview = needsReview ?? false;
    writeLs(LS_POSTS, local);
  }
}

export async function resolveFlag(flagId: string, status: ModerationFlag["status"]): Promise<void> {
  await supabase.from("community_moderation_flags").update({ status }).eq("id", flagId);
  const flags = readLs<ModerationFlag[]>(LS_FLAGS, []).map((f) => (f.id === flagId ? { ...f, status } : f));
  writeLs(LS_FLAGS, flags);
}

export function computeTrendingHashtags(posts: CommunityPost[], limit = 12): HashtagTrend[] {
  const m = new Map<string, number>();
  for (const p of posts) {
    for (const h of p.hashtags ?? []) {
      m.set(h, (m.get(h) ?? 0) + 1 + Math.floor(p.likeCount / 50));
    }
  }
  return [...m.entries()]
    .map(([hashtag, count]) => ({ hashtag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function fetchDealerIdBySlug(slug: string): Promise<string | null> {
  const { data } = await supabase.from("dealers").select("id").eq("slug", slug).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function fetchCommunityNotifications(userId: string): Promise<
  { id: string; title: string; message: string; type: string; link: string | null; isRead: boolean; createdAt: string }[]
> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,message,type,link,is_read,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error || !data) return [];
  return (data as Record<string, unknown>[])
    .filter((r) => String(r.type ?? "").startsWith("community"))
    .map((r) => ({
      id: r.id as string,
      title: r.title as string,
      message: r.message as string,
      type: r.type as string,
      link: (r.link as string) ?? null,
      isRead: Boolean(r.is_read),
      createdAt: r.created_at as string,
    }));
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", userId);
}
