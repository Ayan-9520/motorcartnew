import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SuperAppError } from "@/lib/superapp/errors";
import type { SuperActor } from "@/lib/superapp/http";

const SYSTEM_KINDS = new Set(["INSURANCE_RENEWAL", "SERVICE", "PUC", "WARRANTY", "CUSTOM"]);

function assertOwner(actor: SuperActor, userId: string) {
  if (actor.userId !== userId && actor.role !== "admin" && actor.role !== "super_admin") {
    throw new SuperAppError("Forbidden", 403, "CROSS_TENANT");
  }
}

export async function listReminders(actor: SuperActor) {
  const now = new Date();
  const rows = await prisma.scheduledReminder.findMany({
    where: { userId: actor.userId },
    orderBy: { dueAt: "asc" },
  });
  return rows.map((r) => {
    const due = r.snoozedUntil && r.snoozedUntil > r.dueAt ? r.snoozedUntil : r.dueAt;
    let bucket = r.status;
    if (r.status === "SCHEDULED" || r.status === "SNOOZED") {
      bucket = due < now ? "OVERDUE" : "UPCOMING";
    }
    return { ...r, bucket, dueAtEffective: due };
  });
}

export async function createCustomReminder(actor: SuperActor, input: { title: string; dueAt: string; kind?: string }) {
  const dueAt = new Date(input.dueAt);
  if (Number.isNaN(dueAt.getTime())) throw new SuperAppError("Invalid due date", 400, "INVALID_DATE");
  const title = input.title.trim().slice(0, 120);
  if (!title) throw new SuperAppError("Title required", 400, "INVALID_TITLE");
  return prisma.scheduledReminder.create({
    data: {
      userId: actor.userId,
      kind: input.kind && SYSTEM_KINDS.has(input.kind) ? input.kind : "CUSTOM",
      title,
      dueAt,
      status: "SCHEDULED",
      sourceType: "CUSTOM",
    },
  });
}

export async function completeReminder(actor: SuperActor, id: string) {
  const row = await prisma.scheduledReminder.findUnique({ where: { id } });
  if (!row) throw new SuperAppError("Not found", 404, "NOT_FOUND");
  assertOwner(actor, row.userId);
  return prisma.scheduledReminder.update({
    where: { id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

export async function dismissReminder(actor: SuperActor, id: string) {
  const row = await prisma.scheduledReminder.findUnique({ where: { id } });
  if (!row) throw new SuperAppError("Not found", 404, "NOT_FOUND");
  assertOwner(actor, row.userId);
  return prisma.scheduledReminder.update({
    where: { id },
    data: { status: "DISMISSED", dismissedAt: new Date() },
  });
}

export async function snoozeReminder(actor: SuperActor, id: string, until: string) {
  const row = await prisma.scheduledReminder.findUnique({ where: { id } });
  if (!row) throw new SuperAppError("Not found", 404, "NOT_FOUND");
  assertOwner(actor, row.userId);
  const snoozedUntil = new Date(until);
  if (Number.isNaN(snoozedUntil.getTime()) || snoozedUntil <= new Date()) {
    throw new SuperAppError("Snooze time must be in the future", 400, "INVALID_DATE");
  }
  return prisma.scheduledReminder.update({
    where: { id },
    data: { status: "SNOOZED", snoozedUntil },
  });
}

/** Creates insurance-expiry reminders only when policyEnd exists. Does not invent dates. */
export async function syncSystemReminders(userId: string) {
  const policies = await prisma.insuranceWallet.findMany({
    where: { userId, policyEnd: { not: null } },
  });
  const created = [];
  for (const p of policies) {
    if (!p.policyEnd) continue;
    const existing = await prisma.scheduledReminder.findFirst({
      where: { userId, sourceType: "insurance_wallet", sourceId: p.id },
    });
    if (existing) continue;
    created.push(
      await prisma.scheduledReminder.create({
        data: {
          userId,
          kind: "INSURANCE_RENEWAL",
          title: `Insurance renewal — ${p.insurerName}`,
          dueAt: p.policyEnd,
          status: "SCHEDULED",
          sourceType: "insurance_wallet",
          sourceId: p.id,
        },
      }),
    );
  }
  return created;
}

export async function notifyDueReminders() {
  const now = new Date();
  const due = await prisma.scheduledReminder.findMany({
    where: { status: { in: ["SCHEDULED", "SNOOZED"] }, dueAt: { lte: now } },
  });
  let n = 0;
  for (const r of due) {
    const dueAt = r.snoozedUntil && r.snoozedUntil > now ? r.snoozedUntil : r.dueAt;
    if (dueAt > now) continue;
    const userOk = await prisma.user.findFirst({ where: { id: r.userId }, select: { id: true } });
    if (!userOk) continue;
    const key = `reminder:${r.id}:${dueAt.toISOString().slice(0, 10)}`;
    const exists = await prisma.notification.findFirst({
      where: { userId: r.userId, kind: "reminder", payload: { path: ["dedupe_key"], equals: key } },
    });
    if (exists) continue;
    await prisma.notification.create({
      data: {
        userId: r.userId,
        title: "Reminder due",
        body: r.title,
        message: r.title,
        kind: "reminder",
        payload: { dedupe_key: key, reminderId: r.id } as Prisma.InputJsonValue,
      },
    });
    n += 1;
  }
  return { notified: n };
}
