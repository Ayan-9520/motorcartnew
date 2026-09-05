import { prisma } from "@/lib/prisma";
import {
  getProfileByHandle,
  getBusinessBySlug,
} from "@/services/community-profile.service";
import {
  assertCanViewGroupFeed,
  getCommunityGroupBySlug,
} from "@/services/community-group.service";
import { listFollowedAuthorIds } from "@/services/community-post.service";
import type { Prisma } from "@prisma/client";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type FeedType = "global" | "following" | "user" | "business" | "group";

function visibilityClause(viewerId: string | null, followedIds: string[]): Prisma.SocialPostWhereInput {
  if (!viewerId) {
    return { visibility: "public" };
  }
  return {
    OR: [
      { visibility: "public" },
      { authorId: viewerId },
      ...(followedIds.length
        ? [{ visibility: "followers", authorId: { in: followedIds } }]
        : []),
    ],
  };
}

export async function getCommunityFeed(params: {
  type: FeedType;
  cursor?: string | null;
  limit?: number;
  viewerId?: string | null;
  handle?: string | null;
  business_slug?: string | null;
  group_slug?: string | null;
  dealer_id?: string | null;
  author_id?: string | null;
  vehicle_only?: boolean;
}) {
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const cursorDate = params.cursor ? new Date(params.cursor) : null;
  const viewerId = params.viewerId ?? null;
  const followedIds = viewerId ? await listFollowedAuthorIds(viewerId) : [];

  const clauses: Prisma.SocialPostWhereInput[] = [
    { deletedAt: null },
    {
      OR: [
        { moderationStatus: "approved" },
        ...(viewerId ? [{ authorId: viewerId }] : []),
      ],
    },
    visibilityClause(viewerId, followedIds),
  ];

  if (params.type === "following") {
    if (!viewerId) {
      return { items: [], next_cursor: null, forbidden: false as const };
    }
    const authorIds = [...new Set([...followedIds, viewerId])];
    if (followedIds.length === 0) {
      clauses.push({ authorId: viewerId });
    } else {
      clauses.push({ authorId: { in: authorIds } });
    }
  }

  if (params.type === "user") {
    const handle = params.handle?.replace(/^@/, "");
    if (!handle) return { items: [], next_cursor: null, forbidden: false as const };
    const profile = await getProfileByHandle(handle);
    if (!profile) return { items: [], next_cursor: null, forbidden: false as const };
    clauses.push({ authorId: profile.userId });
  }

  if (params.author_id) {
    clauses.push({ authorId: params.author_id });
  }

  if (params.dealer_id) {
    clauses.push({ dealerId: params.dealer_id });
  }

  if (params.vehicle_only) {
    clauses.push({ vehicleId: { not: null } });
  }

  if (params.type === "business") {
    const slug = params.business_slug;
    if (!slug) return { items: [], next_cursor: null, forbidden: false as const };
    const business = await getBusinessBySlug(slug);
    if (!business) return { items: [], next_cursor: null, forbidden: false as const };
    clauses.push({ authorId: business.ownerUserId });
  }

  if (params.type === "group") {
    const slug = params.group_slug;
    if (!slug) return { items: [], next_cursor: null, forbidden: false as const };
    const group = await getCommunityGroupBySlug(slug);
    if (!group) return { items: [], next_cursor: null, forbidden: false as const };
    const canView = await assertCanViewGroupFeed(group, viewerId);
    if (!canView) {
      return { items: [], next_cursor: null, forbidden: true as const };
    }
    clauses.push({ groupId: group.id });
  }

  if (cursorDate && !Number.isNaN(cursorDate.getTime())) {
    clauses.push({ createdAt: { lt: cursorDate } });
  }

  const posts = await prisma.socialPost.findMany({
    where: { AND: clauses },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          communityProfile: true,
        },
      },
    },
  });

  let likedSet = new Set<string>();
  let savedSet = new Set<string>();
  if (viewerId && posts.length > 0) {
    const ids = posts.map((p) => p.id);
    const [likes, saves] = await Promise.all([
      prisma.postLike.findMany({
        where: { userId: viewerId, postId: { in: ids } },
        select: { postId: true },
      }),
      prisma.communitySave.findMany({
        where: { userId: viewerId, postId: { in: ids } },
        select: { postId: true },
      }),
    ]);
    likedSet = new Set(likes.map((l) => l.postId));
    savedSet = new Set(saves.map((s) => s.postId));
  }

  const next =
    posts.length === limit
      ? posts[posts.length - 1]?.createdAt.toISOString() ?? null
      : null;

  return {
    items: posts.map((p) => ({
      post: p,
      liked_by_me: viewerId ? likedSet.has(p.id) : undefined,
      saved_by_me: viewerId ? savedSet.has(p.id) : undefined,
    })),
    next_cursor: next,
    forbidden: false as const,
  };
}
