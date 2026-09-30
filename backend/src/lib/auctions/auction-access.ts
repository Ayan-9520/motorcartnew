import { prisma } from "@/lib/prisma";
import { extractIdEqFilter } from "@/lib/db/vehicle-ownership";

/** Tables whose rows are only written by the auction engine (RPC / /api/auctions). */
const ENGINE_ONLY_TABLES = new Set([
  "bids",
  "auction_auto_bids",
  "auction_proxy_bids",
  "auction_bid_attempts",
  "auction_bidder_eligibility",
  "auction_notifications",
  "dealer_auction_entries",
]);

const ORGANIZER_EDITABLE = new Set(["title", "images", "location", "metadata", "status"]);

export type AuctionGuard = { ok: true; body?: unknown } | { ok: false; message: string };

const PUBLIC_AUCTION_STATUSES = ["upcoming", "live", "ended"];

/** Pending (awaiting approval) and cancelled lots stay hidden from public / bidder queries. */
export function restrictPublicAuctionFilters(filters: string | undefined): string {
  let list: { column: string; op: string; value: unknown }[] = [];
  try {
    list = filters ? JSON.parse(filters) : [];
  } catch {
    list = [];
  }
  const statusFilters = list.filter((f) => f.column === "status");
  const safe =
    statusFilters.length > 0 &&
    statusFilters.every((f) => {
      const values = f.op === "eq" ? [f.value] : f.op === "in" && Array.isArray(f.value) ? f.value : null;
      return !!values && values.length > 0 && values.every((v) => PUBLIC_AUCTION_STATUSES.includes(String(v)));
    });
  if (!safe) {
    list = list.filter((f) => f.column !== "status");
    list.push({ column: "status", op: "in", value: PUBLIC_AUCTION_STATUSES });
  }
  return JSON.stringify(list);
}

/**
 * Non-admin writes to auction tables via /api/db/query. Bids, auto-bids and results can only be
 * produced by the engine; organisers may edit their own lot details and start an upcoming lot early.
 */
export async function guardAuctionQuery(
  userId: string,
  table: string,
  action: string,
  body: unknown,
  filters: unknown,
): Promise<AuctionGuard> {
  if (action === "select") return { ok: true };

  if (ENGINE_ONLY_TABLES.has(table)) {
    return { ok: false, message: "Use the auction room to bid or register" };
  }

  if (table === "auction_messages") {
    if (action !== "insert") return { ok: false, message: "Forbidden" };
    const row = (Array.isArray(body) ? body[0] : body) as Record<string, unknown> | undefined;
    const message = String(row?.message ?? "").trim().slice(0, 500);
    const auctionId = String(row?.auction_id ?? row?.auctionId ?? "");
    if (!message || !auctionId) return { ok: false, message: "Message required" };
    const auction = await prisma.auction.findUnique({ where: { id: auctionId }, select: { status: true } });
    if (!auction || (auction.status !== "live" && auction.status !== "upcoming")) {
      return { ok: false, message: "Chat is closed for this auction" };
    }
    return {
      ok: true,
      body: {
        auction_id: auctionId,
        user_id: userId,
        display_name: String(row?.display_name ?? row?.displayName ?? "Bidder").trim().slice(0, 60) || "Bidder",
        message,
        is_system: false,
      },
    };
  }

  if (table === "auction_watchlists") {
    if (action !== "insert") return { ok: false, message: "Forbidden" };
    const row = (Array.isArray(body) ? body[0] : body) as Record<string, unknown> | undefined;
    return { ok: true, body: { auction_id: row?.auction_id ?? row?.auctionId, user_id: userId } };
  }

  if (table === "auctions") {
    if (action !== "update" && action !== "patch") {
      return { ok: false, message: "Create auctions from the auction desk" };
    }
    const id = extractIdEqFilter(filters);
    if (!id) return { ok: false, message: "Forbidden" };
    const auction = await prisma.auction.findUnique({ where: { id }, select: { organizerId: true, status: true } });
    if (!auction || auction.organizerId !== userId) return { ok: false, message: "You can only change your own lots" };
    if (auction.status === "ended" || auction.status === "cancelled") return { ok: false, message: "This auction is closed" };
    const patch = (body ?? {}) as Record<string, unknown>;
    const keys = Object.keys(patch);
    if (!keys.length || keys.some((k) => !ORGANIZER_EDITABLE.has(k))) {
      return { ok: false, message: "Only title, images, location and start can be changed" };
    }
    if ("status" in patch && !(patch.status === "live" && auction.status === "upcoming")) {
      return { ok: false, message: "Use Hammer down to close, or wait for admin approval" };
    }
    const safe = { ...patch };
    if (safe.status === "live") safe.starts_at = new Date().toISOString();
    return { ok: true, body: safe };
  }

  return { ok: true };
}

export function isAuctionTable(table: string): boolean {
  return table === "auctions" || table === "auction_messages" || table === "auction_watchlists" || ENGINE_ONLY_TABLES.has(table);
}
