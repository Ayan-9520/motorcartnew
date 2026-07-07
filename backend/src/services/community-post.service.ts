import type { Prisma, SocialPostKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserProfile } from "@/services/community-profile.service";
import { assertCanPostToGroup } from "@/services/community-group.service";

function detectEmbedProvider(url: string): string | null {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/vimeo\.com/i.test(url)) return "vimeo";
  return "link";
}

export async function createSocialPost(
  authorId: string,
  body: {
    content?: string;
    media?: unknown;
    post_kind?: SocialPostKind;
    poll_options?: unknown;
    poll_ends_at?: string | null;
    embed_url?: string | null;
    group_id?: string | null;
    vehicle_id?: string | null;
    dealer_id?: string | null;
    broker_id?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await getOrCreateUserProfile(authorId);

  const postKind = (body.post_kind ?? "discussion") as SocialPostKind;
  const content = String(body.content ?? "").trim();
  const media = Array.isArray(body.media) ? body.media : [];

  if (!content && media.length === 0 && !body.embed_url && postKind !== "poll") {
    throw new Error("EMPTY_POST");
  }

  if (body.group_id) {
    await assertCanPostToGroup(body.group_id, authorId);
  }

  let embedProvider: string | null = null;
  let embedUrl: string | null = body.embed_url ?? null;
  if (embedUrl) {
    embedProvider = detectEmbedProvider(embedUrl);
  }

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.socialPost.create({
      data: {
        authorId,
        content: content || (postKind === "poll" ? "Poll" : ""),
        media,
        postKind,
        vehicleId: body.vehicle_id ?? null,
        dealerId: body.dealer_id ?? null,
        brokerId: body.broker_id ?? null,
        groupId: body.group_id ?? null,
        embedProvider,
        embedUrl,
        pollOptions: body.poll_options ?? undefined,
        pollEndsAt: body.poll_ends_at ? new Date(body.poll_ends_at) : null,
        moderationStatus: "approved",
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue,
      },
      include: {
        author: {
          select: { id: true, fullName: true, avatarUrl: true, communityProfile: true },
        },
      },
    });

    await tx.communityUserProfile.update({
      where: { userId: authorId },
      data: { postCount: { increment: 1 } },
    });

    return created;
  });

  return post;
}

export async function getSocialPostById(postId: string, viewerId?: string | null) {
  const post = await prisma.socialPost.findFirst({
    where: { id: postId, deletedAt: null },
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
  if (!post) return null;

  if (post.moderationStatus !== "approved" && post.authorId !== viewerId) {
    return null;
  }

  let likedByMe: boolean | undefined;
  if (viewerId) {
    const like = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId: viewerId } },
    });
    likedByMe = !!like;
  }

  return { post, likedByMe };
}
