import { readFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  isOverlayRead,
  loadUserReadState,
  markAllUnifiedRead,
  markUnifiedRead,
} from "@/lib/unified-notifications/read-state";
import type {
  NotificationSource,
  UnifiedNotificationItem,
} from "@/lib/unified-notifications/types";
import { NOTIFICATION_SOURCES } from "@/lib/unified-notifications/types";
import type { UnifiedLeadRecord } from "@/lib/lead-router/types";

const LEAD_ROUTER_FILE = path.join(process.cwd(), ".data", "lead-router", "leads.json");

function unifyId(source: NotificationSource, nativeId: string): string {
  return `${source}:${nativeId}`;
}

function payloadObj(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function mergeRead(
  userId: string,
  item: Omit<UnifiedNotificationItem, "is_read">,
  nativeRead: boolean,
  readState: Awaited<ReturnType<typeof loadUserReadState>>
): UnifiedNotificationItem {
  const overlay = isOverlayRead(userId, item.id, item.created_at, readState);
  return { ...item, is_read: nativeRead || overlay };
}

async function loadLeadRouterRows(): Promise<UnifiedLeadRecord[]> {
  try {
    await mkdir(path.dirname(LEAD_ROUTER_FILE), { recursive: true });
    const raw = await readFile(LEAD_ROUTER_FILE, "utf8");
    const parsed = JSON.parse(raw) as { leads?: UnifiedLeadRecord[] };
    return Array.isArray(parsed.leads) ? parsed.leads : [];
  } catch {
    return [];
  }
}

async function aggregateCommunity(userId: string, readState: Awaited<ReturnType<typeof loadUserReadState>>) {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return rows.map((r) => {
    const payload = payloadObj(r.payload);
    const postId = payload.post_id ?? payload.postId;
    const deepLink = postId ? `/community/post/${postId}` : "/community";
    const source: NotificationSource = r.kind === "system" ? "system" : "community";
    const item = {
      id: unifyId(source, r.id),
      source,
      title: r.title,
      body: r.body || r.message || "",
      created_at: r.createdAt.toISOString(),
      deep_link: typeof payload.deep_link === "string" ? payload.deep_link : deepLink,
      native_id: r.id,
      metadata: payload,
    };
    return mergeRead(userId, item, r.isRead, readState);
  });
}

async function aggregateAuction(userId: string, readState: Awaited<ReturnType<typeof loadUserReadState>>) {
  const rows = await prisma.auctionNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return rows.map((r) => {
    const item = {
      id: unifyId("auction", r.id),
      source: "auction" as const,
      title: r.title,
      body: r.body,
      created_at: r.createdAt.toISOString(),
      deep_link: `/auctions/${r.auctionId}`,
      native_id: r.id,
      metadata: { auction_id: r.auctionId, kind: r.kind },
    };
    return mergeRead(userId, item, r.readAt != null, readState);
  });
}

async function aggregateGrowth(userId: string, readState: Awaited<ReturnType<typeof loadUserReadState>>) {
  const workspaces = await prisma.growthWorkspace.findMany({
    where: { ownerUserId: userId, status: { not: "archived" } },
    select: { id: true, slug: true },
  });
  if (!workspaces.length) return [];

  const wsIds = workspaces.map((w) => w.id);
  const logs = await prisma.growthMessageLog.findMany({
    where: { workspaceId: { in: wsIds }, direction: "outbound" },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { workspace: { select: { slug: true } } },
  });

  return logs.map((r) => {
    const item = {
      id: unifyId("growth", r.id),
      source: "growth" as const,
      title: "Growth WhatsApp activity",
      body: r.body.slice(0, 200),
      created_at: r.createdAt.toISOString(),
      deep_link: `/dashboard/growth/whatsapp`,
      native_id: r.id,
      metadata: {
        workspace_id: r.workspaceId,
        status: r.status,
        broadcast_id: r.broadcastId,
      },
    };
    return mergeRead(userId, item, false, readState);
  });
}

async function aggregateSystem(userId: string, readState: Awaited<ReturnType<typeof loadUserReadState>>) {
  const [logs, platform] = await Promise.all([
    prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.platformNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const userLogs = logs.map((r) => {
    const meta = payloadObj(r.metadata);
    const item = {
      id: unifyId("system", `log_${r.id}`),
      source: "system" as const,
      title: r.title,
      body: r.body ?? "",
      created_at: r.createdAt.toISOString(),
      deep_link: typeof meta.deep_link === "string" ? meta.deep_link : "/profile",
      native_id: r.id,
      metadata: meta,
    };
    return mergeRead(userId, item, r.readAt != null, readState);
  });

  const platformRows = platform.map((r) => {
    const meta = payloadObj(r.metadata);
    const item = {
      id: unifyId("system", `platform_${r.id}`),
      source: "system" as const,
      title: r.title,
      body: r.body,
      created_at: r.createdAt.toISOString(),
      deep_link: typeof meta.deep_link === "string" ? meta.deep_link : "/",
      native_id: r.id,
      metadata: { audience: r.audience, broadcast: true },
    };
    return mergeRead(userId, item, false, readState);
  });

  return [...userLogs, ...platformRows];
}

async function aggregateLeadRouter(userId: string, readState: Awaited<ReturnType<typeof loadUserReadState>>) {
  const leads = await loadLeadRouterRows();
  return leads
    .filter((l) => l.ownership.owner_user_id === userId)
    .slice(0, 30)
    .map((l) => {
      const item = {
        id: unifyId("lead_router", l.id),
        source: "lead_router" as const,
        title: `Lead routed (${l.source})`,
        body: l.intent ?? `Routed to ${l.destination}`,
        created_at: l.created_at,
        deep_link: "/dashboard/super-admin/lead-router",
        native_id: l.id,
        metadata: {
          destination: l.destination,
          status: l.status,
        },
      };
      return mergeRead(userId, item, false, readState);
    });
}

async function aggregateDirectory(userId: string, readState: Awaited<ReturnType<typeof loadUserReadState>>) {
  const businesses = await prisma.communityBusinessProfile.findMany({
    where: { ownerUserId: userId },
    select: { id: true, slug: true, entityType: true },
  });
  if (!businesses.length) return [];

  const bizIds = businesses.map((b) => b.id);
  const follows = await prisma.communityFollow.findMany({
    where: { targetType: "business", targetBusinessId: { in: bizIds } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const slugById = Object.fromEntries(businesses.map((b) => [b.id, b.slug]));

  return follows.map((f) => {
    const slug = f.targetBusinessId ? slugById[f.targetBusinessId] : null;
    const item = {
      id: unifyId("directory", f.id),
      source: "directory" as const,
      title: "New directory follower",
      body: "Someone followed your business profile.",
      created_at: f.createdAt.toISOString(),
      deep_link: slug ? `/business/${slug}` : "/directory",
      native_id: f.id,
      metadata: { target_business_id: f.targetBusinessId },
    };
    return mergeRead(userId, item, false, readState);
  });
}

export async function listUnifiedNotifications(
  userId: string,
  filters?: { unread_only?: boolean; source?: string; limit?: number; offset?: number }
) {
  const readState = await loadUserReadState(userId);
  const [community, auction, growth, system, leadRouter, directory] = await Promise.all([
    aggregateCommunity(userId, readState),
    aggregateAuction(userId, readState),
    aggregateGrowth(userId, readState),
    aggregateSystem(userId, readState),
    aggregateLeadRouter(userId, readState),
    aggregateDirectory(userId, readState),
  ]);

  let items = [...community, ...auction, ...growth, ...system, ...leadRouter, ...directory];
  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const seen = new Set<string>();
  items = items.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  if (filters?.source && NOTIFICATION_SOURCES.includes(filters.source as NotificationSource)) {
    items = items.filter((i) => i.source === filters.source);
  }
  if (filters?.unread_only) {
    items = items.filter((i) => !i.is_read);
  }

  const total = items.length;
  const offset = filters?.offset ?? 0;
  const limit = Math.min(filters?.limit ?? 100, 200);
  const page = items.slice(offset, offset + limit);

  return { total, limit, offset, items: page };
}

export async function getUnifiedNotificationsOverview(userId: string) {
  const { items, total } = await listUnifiedNotifications(userId, { limit: 500 });
  const unread = items.filter((i) => !i.is_read).length;
  const bySource: Record<string, { total: number; unread: number }> = {};

  for (const s of NOTIFICATION_SOURCES) {
    bySource[s] = { total: 0, unread: 0 };
  }
  for (const i of items) {
    bySource[i.source].total += 1;
    if (!i.is_read) bySource[i.source].unread += 1;
  }

  return {
    aggregation_only: true,
    note: "Read state overlay does not modify source module records.",
    total,
    unread,
    by_source: bySource,
    sources: NOTIFICATION_SOURCES,
  };
}

async function persistNativeNotificationRead(userId: string, unifiedId: string) {
  const colon = unifiedId.indexOf(":");
  const source = colon >= 0 ? unifiedId.slice(0, colon) : "";
  const native = colon >= 0 ? unifiedId.slice(colon + 1) : unifiedId;
  const now = new Date();

  if (source === "system" && native.startsWith("log_")) {
    const id = native.slice(4);
    await prisma.notificationLog.updateMany({ where: { id, userId }, data: { readAt: now } });
    return;
  }
  if (source === "auction") {
    await prisma.auctionNotification.updateMany({ where: { id: native, userId }, data: { readAt: now } });
    return;
  }
  if (source === "community" || source === "system") {
    await prisma.notification.updateMany({
      where: { id: native, userId },
      data: { isRead: true, readAt: now },
    });
  }
}

export async function markNotificationReadUnified(userId: string, unifiedId: string) {
  await persistNativeNotificationRead(userId, unifiedId);
  await markUnifiedRead(userId, unifiedId);
  return { id: unifiedId, is_read: true };
}

export async function markAllNotificationsReadUnified(userId: string) {
  await markAllUnifiedRead(userId);
  return { read_all_at: new Date().toISOString() };
}
