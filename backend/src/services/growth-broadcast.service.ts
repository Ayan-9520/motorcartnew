import type { GrowthBroadcastStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertQuota,
  incrementUsage,
} from "@/lib/growth/entitlements";

export function listBroadcasts(workspaceId: string) {
  return prisma.growthWhatsappBroadcast.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      template: { select: { id: true, name: true, templateKey: true } },
      list: { select: { id: true, name: true } },
      _count: { select: { recipients: true } },
    },
  });
}

export function getBroadcast(workspaceId: string, id: string) {
  return prisma.growthWhatsappBroadcast.findFirst({
    where: { id, workspaceId },
    include: {
      template: true,
      list: true,
      recipients: { take: 500, orderBy: { createdAt: "asc" } },
      _count: { select: { recipients: true, messageLogs: true } },
    },
  });
}

export async function createBroadcast(
  workspaceId: string,
  data: {
    templateId: string;
    listId: string;
    name: string;
    scheduleAt?: Date | null;
    metadata?: Prisma.InputJsonValue;
  }
) {
  const [template, list] = await Promise.all([
    prisma.growthWhatsappTemplate.findFirst({
      where: { id: data.templateId, workspaceId },
    }),
    prisma.growthContactList.findFirst({
      where: { id: data.listId, workspaceId },
    }),
  ]);
  if (!template || !list) return null;

  return prisma.growthWhatsappBroadcast.create({
    data: {
      workspaceId,
      templateId: data.templateId,
      listId: data.listId,
      name: data.name,
      scheduleAt: data.scheduleAt ?? null,
      status: data.scheduleAt ? "scheduled" : "draft",
      metadata: data.metadata ?? {},
    },
  });
}

export async function updateBroadcast(
  workspaceId: string,
  id: string,
  data: Prisma.GrowthWhatsappBroadcastUpdateInput
) {
  const row = await prisma.growthWhatsappBroadcast.findFirst({
    where: { id, workspaceId },
  });
  if (!row) return null;
  return prisma.growthWhatsappBroadcast.update({ where: { id }, data });
}

export async function scheduleBroadcast(
  workspaceId: string,
  id: string,
  scheduleAt: Date
) {
  return updateBroadcast(workspaceId, id, {
    scheduleAt,
    status: "scheduled",
  });
}

export async function cancelBroadcast(workspaceId: string, id: string) {
  const row = await prisma.growthWhatsappBroadcast.findFirst({
    where: { id, workspaceId },
  });
  if (!row) return null;
  if (!["draft", "scheduled"].includes(row.status)) return null;
  return prisma.growthWhatsappBroadcast.update({
    where: { id },
    data: { status: "cancelled" },
  });
}

/** Mock send — no external provider; marks recipients + logs as sent/delivered */
export async function mockSendBroadcast(workspaceId: string, id: string) {
  const broadcast = await prisma.growthWhatsappBroadcast.findFirst({
    where: { id, workspaceId },
    include: { template: true, list: true },
  });
  if (!broadcast) return null;
  if (["completed", "cancelled"].includes(broadcast.status)) return null;

  const members = await prisma.growthContactListMember.findMany({
    where: {
      listId: broadcast.listId,
      optOutAt: null,
    },
  });

  await assertQuota(workspaceId, "broadcasts_monthly", "broadcasts_sent", members.length || 1);

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.growthWhatsappBroadcast.update({
      where: { id },
      data: {
        status: "sending",
        startedAt: now,
      },
    });

    for (const m of members) {
      await tx.growthWhatsappBroadcastRecipient.upsert({
        where: { broadcastId_phone: { broadcastId: id, phone: m.phone } },
        create: {
          broadcastId: id,
          phone: m.phone,
          status: "delivered",
          lastEventAt: now,
          metadata: { mock: true },
        },
        update: {
          status: "delivered",
          lastEventAt: now,
        },
      });

      await tx.growthMessageLog.create({
        data: {
          workspaceId,
          broadcastId: id,
          channel: "whatsapp",
          direction: "outbound",
          phone: m.phone,
          body: broadcast.template.body,
          status: "delivered",
          providerId: "mock-j1",
          metadata: { mock_send: true },
        },
      });
    }

    await tx.growthWhatsappBroadcast.update({
      where: { id },
      data: {
        status: "completed",
        completedAt: now,
      },
    });
  });

  await incrementUsage(workspaceId, "broadcasts_sent", members.length || 1);

  return getBroadcast(workspaceId, id);
}

export function listMessageLogs(workspaceId: string, broadcastId?: string) {
  return prisma.growthMessageLog.findMany({
    where: {
      workspaceId,
      ...(broadcastId ? { broadcastId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export function listBroadcastRecipients(broadcastId: string, workspaceId: string) {
  return prisma.growthWhatsappBroadcastRecipient.findMany({
    where: { broadcastId, broadcast: { workspaceId } },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
}
