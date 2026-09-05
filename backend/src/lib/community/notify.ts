import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function notifyCommunityOnce(input: {
  recipientUserId: string;
  actorUserId: string;
  title: string;
  body: string;
  event: string;
  targetId: string;
  postId?: string | null;
  deepLink?: string;
}) {
  if (input.recipientUserId === input.actorUserId) return;
  const dedupeKey = `community:${input.event}:${input.actorUserId}:${input.targetId}`;
  const payload = {
    kind: "community",
    event: input.event,
    actor_id: input.actorUserId,
    target_id: input.targetId,
    post_id: input.postId ?? null,
    dedupe_key: dedupeKey,
    deep_link: input.deepLink ?? (input.postId ? `/community/post/${input.postId}` : "/community"),
  };

  const existing = await prisma.notification.findFirst({
    where: {
      userId: input.recipientUserId,
      kind: "community",
      payload: { path: ["dedupe_key"], equals: dedupeKey },
    },
    select: { id: true },
  });
  if (existing) return;

  try {
    await prisma.notification.create({
      data: {
        userId: input.recipientUserId,
        title: input.title,
        body: input.body,
        message: input.body,
        kind: "community",
        payload: payload as Prisma.InputJsonValue,
      },
    });
  } catch {
    /* in-app notification must not block community writes */
  }
}
