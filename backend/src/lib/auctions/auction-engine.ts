import { Prisma, type AuctionCategory, type AuctionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { JwtPayload } from "@/lib/auth/jwt";
import { emitDbChange } from "@/lib/socket-emit";
import { canActForDealer, canMutateVehicle } from "@/lib/db/vehicle-ownership";

type Tx = Prisma.TransactionClient;
type Args = Record<string, unknown>;

/** Bids placed in the last ANTI_SNIPE_WINDOW_MS extend the close by ANTI_SNIPE_EXTEND_MS. */
const ANTI_SNIPE_WINDOW_MS = 2 * 60_000;
const ANTI_SNIPE_EXTEND_MS = 2 * 60_000;
const MAX_AUTO_BID_ROUNDS = 12;
const SWEEP_INTERVAL_MS = 20_000;

export const AUCTION_ADMIN_ROLES = new Set(["admin", "super_admin"]);
export const AUCTION_ORGANIZER_ROLES = new Set(["admin", "super_admin", "auction_partner"]);

export type AuctionResult = { ok: boolean; error?: string; [key: string]: unknown };

const fail = (error: string): AuctionResult => ({ ok: false, error });

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function auctionRow(a: {
  id: string;
  status: AuctionStatus;
  currentBid: Prisma.Decimal | null;
  bidCount: number;
  endsAt: Date;
  startsAt: Date;
  winnerId: string | null;
}) {
  return {
    id: a.id,
    status: a.status,
    current_bid: a.currentBid != null ? Number(a.currentBid) : null,
    bid_count: a.bidCount,
    ends_at: a.endsAt.toISOString(),
    starts_at: a.startsAt.toISOString(),
    winner_id: a.winnerId,
  };
}

async function lockAuction(tx: Tx, auctionId: string) {
  await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${auctionId} FOR UPDATE`;
  return tx.auction.findUnique({ where: { id: auctionId } });
}

function minNextBid(a: { currentBid: Prisma.Decimal | null; startPrice: Prisma.Decimal; bidIncrement: Prisma.Decimal; bidCount: number }) {
  if (a.currentBid == null || a.bidCount === 0) return Number(a.startPrice);
  return Number(a.currentBid) + Number(a.bidIncrement);
}

async function notify(
  tx: Tx,
  rows: { auctionId: string; userId: string; kind: string; title: string; body: string }[],
) {
  const created = [];
  for (const r of rows) {
    created.push(await tx.auctionNotification.create({ data: r }));
  }
  return created;
}

function emitNotifications(rows: Awaited<ReturnType<typeof notify>>) {
  for (const n of rows) {
    emitDbChange("auction_notifications", "INSERT", {
      new: {
        id: n.id,
        auction_id: n.auctionId,
        user_id: n.userId,
        kind: n.kind,
        title: n.title,
        body: n.body,
        created_at: n.createdAt.toISOString(),
      },
    });
  }
}

type BidRow = { id: string; auctionId: string; bidderId: string; bidderName: string | null; amount: Prisma.Decimal; isAutoBid: boolean; createdAt: Date };

function emitBid(b: BidRow) {
  emitDbChange("bids", "INSERT", {
    new: {
      id: b.id,
      auction_id: b.auctionId,
      bidder_id: b.bidderId,
      bidder_name: b.bidderName,
      amount: Number(b.amount),
      is_auto_bid: b.isAutoBid,
      created_at: b.createdAt.toISOString(),
    },
  });
}

async function bidderName(tx: Tx, userId: string) {
  const u = await tx.user.findUnique({ where: { id: userId }, select: { fullName: true, companyName: true } });
  const name = (u?.companyName || u?.fullName || "").trim();
  if (!name) return "Bidder";
  const [first, ...rest] = name.split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1]![0]}.` : first!;
}

/**
 * Proxy bidding: whoever holds the highest auto-bid cap leads at the lowest price that beats
 * every other cap (earlier cap wins ties). Runs inside the caller's locked transaction.
 */
async function resolveAutoBids(tx: Tx, auctionId: string, created: BidRow[]) {
  for (let round = 0; round < MAX_AUTO_BID_ROUNDS; round++) {
    const auction = await tx.auction.findUnique({ where: { id: auctionId } });
    if (!auction || auction.status !== "live") return;
    const leader = await tx.auctionBid.findFirst({
      where: { auctionId },
      orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
    });
    const increment = Number(auction.bidIncrement);
    const need = minNextBid(auction);
    const caps = await tx.auctionAutoBid.findMany({
      where: { auctionId, isActive: true },
      orderBy: [{ maxAmount: "desc" }, { createdAt: "asc" }],
    });
    const challenger = caps.find((c) => c.bidderId !== leader?.bidderId && Number(c.maxAmount) >= need);
    if (!challenger) return;

    const current = Number(auction.currentBid ?? 0);
    const leaderCap = caps.find((c) => c.bidderId === leader?.bidderId);
    const challengerMax = Number(challenger.maxAmount);

    const place = async (bidderId: string, amount: number) => {
      const bid = await tx.auctionBid.create({
        data: { auctionId, bidderId, bidderName: await bidderName(tx, bidderId), amount, isAutoBid: true, bidSource: "auto" },
      });
      await tx.auction.update({ where: { id: auctionId }, data: { currentBid: amount, bidCount: { increment: 1 } } });
      created.push(bid);
    };

    if (leaderCap) {
      const leaderMax = Number(leaderCap.maxAmount);
      if (leaderMax === challengerMax) {
        // Equal caps: the earlier cap takes the lot at that price.
        if (leaderCap.createdAt <= challenger.createdAt) {
          if (current < leaderMax) await place(leaderCap.bidderId, leaderMax);
        } else {
          await place(challenger.bidderId, challengerMax);
        }
        return;
      }
      if (leaderMax > challengerMax) {
        await place(challenger.bidderId, challengerMax);
        await place(leaderCap.bidderId, Math.min(leaderMax, challengerMax + increment));
        return;
      }
      if (leaderMax > current) await place(leaderCap.bidderId, leaderMax);
      await place(challenger.bidderId, Math.min(challengerMax, Math.max(need, leaderMax + increment)));
      continue;
    }
    await place(challenger.bidderId, Math.min(challengerMax, need));
  }
}

async function maybeExtend(tx: Tx, auctionId: string, endsAt: Date) {
  const left = endsAt.getTime() - Date.now();
  if (left > ANTI_SNIPE_WINDOW_MS) return null;
  const next = new Date(Date.now() + ANTI_SNIPE_EXTEND_MS);
  await tx.auction.update({ where: { id: auctionId }, data: { endsAt: next } });
  return next;
}

async function checkBidder(tx: Tx, auth: JwtPayload, auction: { organizerId: string | null; vehicleId: string | null }) {
  if (auction.organizerId === auth.sub) return "You can't bid on your own auction";
  if (auction.vehicleId) {
    const v = await tx.vehicle.findUnique({ where: { id: auction.vehicleId }, select: { sellerId: true } });
    if (v?.sellerId === auth.sub) return "You can't bid on your own vehicle";
  }
  const user = await tx.user.findUnique({ where: { id: auth.sub }, select: { status: true } });
  if (!user || String(user.status) !== "active") return "Your account can't bid right now";
  return null;
}

/** Brings a lot live if its start time passed (the sweep may not have run yet). */
async function ensureLive(tx: Tx, auction: NonNullable<Awaited<ReturnType<typeof lockAuction>>>) {
  const now = Date.now();
  if (auction.status === "upcoming" && auction.startsAt.getTime() <= now && auction.endsAt.getTime() > now) {
    return tx.auction.update({ where: { id: auction.id }, data: { status: "live" } });
  }
  return auction;
}

export async function placeAuctionBid(args: Args, auth: JwtPayload | null): Promise<AuctionResult> {
  if (!auth) throw new Error("Unauthorized");
  const auctionId = String(args.p_auction_id ?? args.auction_id ?? "");
  const amount = num(args.p_amount ?? args.amount);
  if (!auctionId) return fail("Auction required");
  if (!Number.isFinite(amount) || amount <= 0) return fail("Enter a valid bid amount");

  const created: BidRow[] = [];
  let notices: Awaited<ReturnType<typeof notify>> = [];
  const result = await prisma.$transaction(async (tx) => {
    const locked = await lockAuction(tx, auctionId);
    if (!locked) return fail("Auction not found");
    const auction = await ensureLive(tx, locked);
    if (auction.status !== "live") return fail(auction.status === "upcoming" ? "Bidding hasn't opened yet" : "This auction is closed");
    if (auction.endsAt.getTime() <= Date.now()) return fail("This auction has ended");

    const blocked = await checkBidder(tx, auth, auction);
    if (blocked) return fail(blocked);

    const need = minNextBid(auction);
    if (amount < need) return fail(`Minimum bid is ₹${need.toLocaleString("en-IN")}`);

    const previousLeader = await tx.auctionBid.findFirst({
      where: { auctionId },
      orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
    });
    if (previousLeader?.bidderId === auth.sub) return fail("You're already the highest bidder");

    const bid = await tx.auctionBid.create({
      data: {
        auctionId,
        bidderId: auth.sub,
        bidderName: await bidderName(tx, auth.sub),
        amount,
        isAutoBid: false,
        bidSource: "manual",
      },
    });
    created.push(bid);
    await tx.auction.update({ where: { id: auctionId }, data: { currentBid: amount, bidCount: { increment: 1 } } });
    await resolveAutoBids(tx, auctionId, created);
    const extendedTo = await maybeExtend(tx, auctionId, auction.endsAt);

    const leader = await tx.auctionBid.findFirst({
      where: { auctionId },
      orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
    });
    const outbid = new Set<string>();
    if (previousLeader && previousLeader.bidderId !== leader?.bidderId) outbid.add(previousLeader.bidderId);
    if (leader && leader.bidderId !== auth.sub) outbid.add(auth.sub);
    notices = await notify(
      tx,
      [...outbid].map((userId) => ({
        auctionId,
        userId,
        kind: "outbid",
        title: "You've been outbid",
        body: `${auction.title} — current bid ₹${Number(leader?.amount ?? amount).toLocaleString("en-IN")}`,
      })),
    );

    const fresh = await tx.auction.findUniqueOrThrow({ where: { id: auctionId } });
    return {
      ok: true,
      bid_id: bid.id,
      amount,
      bidder_name: bid.bidderName,
      extended: !!extendedTo,
      leading: leader?.bidderId === auth.sub,
      auction: auctionRow(fresh),
    } satisfies AuctionResult;
  });

  if (result.ok) {
    created.forEach(emitBid);
    emitDbChange("auctions", "UPDATE", { new: result.auction as Record<string, unknown> });
    emitNotifications(notices);
  }
  return result;
}

export async function setAuctionAutoBid(args: Args, auth: JwtPayload | null): Promise<AuctionResult> {
  if (!auth) throw new Error("Unauthorized");
  const auctionId = String(args.p_auction_id ?? args.auction_id ?? "");
  const maxAmount = num(args.p_max_amount ?? args.max_amount);
  if (!auctionId) return fail("Auction required");
  if (!Number.isFinite(maxAmount) || maxAmount <= 0) return fail("Enter a valid maximum");

  const created: BidRow[] = [];
  const result = await prisma.$transaction(async (tx) => {
    const locked = await lockAuction(tx, auctionId);
    if (!locked) return fail("Auction not found");
    const auction = await ensureLive(tx, locked);
    if (auction.status !== "live" || auction.endsAt.getTime() <= Date.now()) return fail("Auto-bid works only on live auctions");
    const blocked = await checkBidder(tx, auth, auction);
    if (blocked) return fail(blocked);
    const leader = await tx.auctionBid.findFirst({
      where: { auctionId },
      orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
    });
    const floor = leader?.bidderId === auth.sub ? Number(auction.currentBid ?? 0) + Number(auction.bidIncrement) : minNextBid(auction);
    if (maxAmount < floor) return fail(`Maximum must be at least ₹${floor.toLocaleString("en-IN")}`);

    await tx.auctionAutoBid.upsert({
      where: { auctionId_bidderId: { auctionId, bidderId: auth.sub } },
      create: { auctionId, bidderId: auth.sub, maxAmount, isActive: true },
      update: { maxAmount, isActive: true },
    });
    await resolveAutoBids(tx, auctionId, created);
    if (created.length) await maybeExtend(tx, auctionId, auction.endsAt);
    const fresh = await tx.auction.findUniqueOrThrow({ where: { id: auctionId } });
    return { ok: true, max_amount: maxAmount, auction: auctionRow(fresh) } satisfies AuctionResult;
  });

  if (result.ok) {
    created.forEach(emitBid);
    if (created.length) emitDbChange("auctions", "UPDATE", { new: result.auction as Record<string, unknown> });
  }
  return result;
}

/**
 * Closes a lot. Admin/organizer may hammer early; anyone (incl. system sweep) once the clock ran out.
 * Winner only when the top bid meets the reserve.
 */
export async function finalizeAuction(args: Args, auth: JwtPayload | null, opts: { system?: boolean } = {}): Promise<AuctionResult> {
  if (!auth && !opts.system) throw new Error("Unauthorized");
  const auctionId = String(args.p_auction_id ?? args.auction_id ?? "");
  if (!auctionId) return fail("Auction required");

  let notices: Awaited<ReturnType<typeof notify>> = [];
  const result = await prisma.$transaction(async (tx) => {
    const auction = await lockAuction(tx, auctionId);
    if (!auction) return fail("Auction not found");
    if (auction.status === "ended") {
      return {
        ok: true,
        already: true,
        winner_id: auction.winnerId,
        winning_amount: auction.winnerId ? Number(auction.currentBid ?? 0) : null,
        reserve_met: !!auction.winnerId,
        auction: auctionRow(auction),
      } satisfies AuctionResult;
    }
    if (auction.status === "cancelled" || auction.status === "pending") return fail("This auction isn't running");

    const privileged = !!auth && (AUCTION_ADMIN_ROLES.has(auth.role) || auction.organizerId === auth.sub);
    if (!opts.system && !privileged && auction.endsAt.getTime() > Date.now()) {
      return fail("Auction is still running");
    }

    const top = await tx.auctionBid.findFirst({
      where: { auctionId },
      orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
    });
    const reserve = auction.reservePrice != null ? Number(auction.reservePrice) : null;
    const reserveMet = !!top && (reserve == null || Number(top.amount) >= reserve);
    const winnerId = reserveMet ? top!.bidderId : null;
    const meta = (auction.metadata ?? {}) as Record<string, unknown>;

    const updated = await tx.auction.update({
      where: { id: auctionId },
      data: {
        status: "ended",
        winnerId,
        endsAt: auction.endsAt.getTime() > Date.now() ? new Date() : auction.endsAt,
        metadata: {
          ...meta,
          reserve_met: reserveMet,
          closed_at: new Date().toISOString(),
          closed_by: opts.system ? "system" : auth?.sub,
          winning_amount: winnerId ? Number(top!.amount) : null,
        } as Prisma.InputJsonValue,
      },
    });
    await tx.auctionAutoBid.updateMany({ where: { auctionId }, data: { isActive: false } });

    const price = top ? `₹${Number(top.amount).toLocaleString("en-IN")}` : "";
    const rows: Parameters<typeof notify>[1] = [];
    if (winnerId) {
      rows.push({
        auctionId,
        userId: winnerId,
        kind: "won",
        title: "You won the auction!",
        body: `${auction.title} — winning bid ${price}. Our team will contact you for payment & delivery.`,
      });
    } else if (top) {
      rows.push({
        auctionId,
        userId: top.bidderId,
        kind: "auction_ended",
        title: "Auction closed — reserve not met",
        body: `${auction.title} closed at ${price}, below the seller's reserve. The seller may contact you.`,
      });
    }
    if (auction.organizerId && auction.organizerId !== winnerId) {
      rows.push({
        auctionId,
        userId: auction.organizerId,
        kind: "auction_ended",
        title: winnerId ? "Your lot is sold" : "Your auction closed",
        body: winnerId
          ? `${auction.title} sold for ${price}.`
          : top
            ? `${auction.title} closed at ${price} — below your reserve.`
            : `${auction.title} closed with no bids.`,
      });
    }
    notices = await notify(tx, rows);

    return {
      ok: true,
      winner_id: winnerId,
      winning_amount: winnerId ? Number(top!.amount) : null,
      reserve_met: reserveMet,
      auction: auctionRow(updated),
    } satisfies AuctionResult;
  });

  if (result.ok && !result.already) {
    emitDbChange("auctions", "UPDATE", { new: result.auction as Record<string, unknown> });
    emitNotifications(notices);
    if (notices.length) {
      await prisma.notification
        .createMany({
          data: notices.map((n) => ({
            userId: n.userId,
            title: n.title,
            body: n.body,
            message: n.body,
            kind: "auction",
            payload: { auctionId: n.auctionId } as Prisma.InputJsonValue,
          })),
        })
        .catch(() => undefined);
    }
  }
  return result;
}

let lastSweep = 0;
let sweeping: Promise<void> | null = null;

/** Opens lots whose start time passed and closes lots whose clock ran out. Throttled. */
export function sweepAuctionStatuses(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastSweep < SWEEP_INTERVAL_MS) return Promise.resolve();
  if (sweeping) return sweeping;
  lastSweep = now;
  sweeping = (async () => {
    try {
      const at = new Date();
      const opening = await prisma.auction.findMany({
        where: { status: "upcoming", startsAt: { lte: at }, endsAt: { gt: at } },
        select: { id: true },
      });
      if (opening.length) {
        await prisma.auction.updateMany({ where: { id: { in: opening.map((a) => a.id) } }, data: { status: "live" } });
        for (const a of opening) emitDbChange("auctions", "UPDATE", { new: { id: a.id, status: "live" } });
      }
      const closing = await prisma.auction.findMany({
        where: { status: { in: ["live", "upcoming"] }, endsAt: { lte: at } },
        select: { id: true },
        take: 50,
      });
      for (const a of closing) {
        await finalizeAuction({ auction_id: a.id }, null, { system: true }).catch((e) =>
          console.error("[auction-sweep] finalize", a.id, e),
        );
      }
    } catch (e) {
      console.error("[auction-sweep]", e);
    } finally {
      sweeping = null;
    }
  })();
  return sweeping;
}

export async function registerDealerForAuction(args: Args, auth: JwtPayload | null): Promise<AuctionResult> {
  if (!auth) throw new Error("Unauthorized");
  const auctionId = String(args.p_auction_id ?? args.auction_id ?? "");
  if (!auctionId) return fail("Auction required");
  const auction = await prisma.auction.findUnique({ where: { id: auctionId }, select: { status: true } });
  if (!auction) return fail("Auction not found");
  if (auction.status !== "live" && auction.status !== "upcoming") return fail("Registration is closed for this auction");

  const requested = args.p_dealer_id ?? args.dealer_id;
  let dealerId: string | null = null;
  if (requested) {
    if (!(await canActForDealer(auth.sub, String(requested)))) return fail("Not your dealership");
    dealerId = String(requested);
  } else {
    const own = await prisma.dealer.findFirst({
      where: { ownerId: auth.sub, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    dealerId = own?.id ?? null;
  }
  if (!dealerId) return fail("Create your dealer profile first");

  const maxBid = num(args.p_max_bid ?? args.max_bid);
  const entry = await prisma.dealerAuctionEntry.upsert({
    where: { dealerId_auctionId: { dealerId, auctionId } },
    create: { dealerId, auctionId, status: "registered", maxBid: Number.isFinite(maxBid) && maxBid > 0 ? BigInt(Math.round(maxBid)) : null },
    update: { status: "registered" },
  });
  return { ok: true, registered: true, entry_id: entry.id };
}

const CATEGORIES = new Set<AuctionCategory>(["bank", "insurance", "fleet", "dealer", "government"]);

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "lot";
}

export type CreateAuctionInput = {
  title?: string;
  vehicleId?: string;
  startPrice?: number;
  reservePrice?: number | null;
  bidIncrement?: number;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  images?: string[];
  category?: string;
  assetClass?: string;
  description?: string;
  details?: Record<string, unknown>;
};

const DETAIL_TEXT_FIELDS = [
  "brand",
  "model",
  "variant",
  "fuel",
  "transmission",
  "registration_state",
  "registration_number",
  "rc_status",
  "insurance_valid_till",
  "hypothecation",
  "accident_history",
  "inspection_notes",
] as const;

/** Whitelisted vehicle facts shown to bidders on the lot page (`metadata.vehicle_details`). */
function sanitizeVehicleDetails(raw: unknown): Record<string, string | number> {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: Record<string, string | number> = {};
  for (const key of DETAIL_TEXT_FIELDS) {
    const v = src[key];
    if (v == null) continue;
    const s = String(v).trim().slice(0, key === "inspection_notes" ? 1000 : 80);
    if (s) out[key] = s;
  }
  if (typeof out.registration_number === "string") {
    const reg = out.registration_number.replace(/[^a-z0-9]/gi, "").toUpperCase();
    out.registration_number = reg.length > 6 ? `${reg.slice(0, 4)}XXXX${reg.slice(-2)}` : reg.slice(0, 4);
  }
  const year = Number(src.year);
  if (Number.isInteger(year) && year >= 1950 && year <= new Date().getFullYear() + 1) out.year = year;
  const km = Number(src.km_driven);
  if (Number.isFinite(km) && km >= 0 && km < 5_000_000) out.km_driven = Math.round(km);
  const owners = Number(src.owners);
  if (Number.isInteger(owners) && owners >= 1 && owners <= 10) out.owners = owners;
  return out;
}

const ASSET_CLASSES = new Set(["commercial", "cars", "tractors", "two-wheelers", "buses", "construction"]);

function inferAssetClass(vehicleCategory: string | null | undefined, title: string): string {
  const cat = (vehicleCategory ?? "").toLowerCase();
  if (cat.includes("bike") || cat.includes("scooter")) return "two-wheelers";
  if (cat.includes("truck")) return "commercial";
  if (cat.includes("bus")) return "buses";
  const t = title.toLowerCase();
  if (/\b(tractor|harvester|rotavator)\b/.test(t)) return "tractors";
  if (/\b(jcb|excavator|crane|loader|mixer|backhoe|dozer)\b/.test(t)) return "construction";
  if (/\b(truck|tipper|trailer|pickup|tempo|lcv|hcv)\b/.test(t)) return "commercial";
  if (/\b(bus|coach)\b/.test(t)) return "buses";
  if (/\b(bike|scooter|motorcycle|activa|splendor|pulsar|royal enfield)\b/.test(t)) return "two-wheelers";
  return "cars";
}

/**
 * Admin / auction partner lots go straight to schedule; dealer and customer lots (own vehicle only)
 * wait in `pending` for admin approval.
 */
export async function createAuctionLot(auth: JwtPayload, input: CreateAuctionInput): Promise<AuctionResult> {
  const organizer = AUCTION_ORGANIZER_ROLES.has(auth.role);
  let vehicle: { id: string; title: string; images: unknown; price: Prisma.Decimal; city: string; category: string } | null = null;
  if (input.vehicleId) {
    vehicle = await prisma.vehicle.findFirst({
      where: { id: input.vehicleId, deletedAt: null },
      select: { id: true, title: true, images: true, price: true, city: true, category: true },
    });
    if (!vehicle) return fail("Vehicle not found");
    if (!organizer && !(await canMutateVehicle(auth.sub, vehicle.id))) return fail("You can only auction your own vehicle");
    const running = await prisma.auction.findFirst({
      where: { vehicleId: vehicle.id, status: { in: ["upcoming", "live", "pending"] } },
      select: { id: true },
    });
    if (running) return fail("This vehicle already has an active auction");
  }

  if (!organizer) {
    const pendingCount = await prisma.auction.count({ where: { organizerId: auth.sub, status: "pending" } });
    if (pendingCount >= 5) return fail("You already have 5 lots awaiting approval — wait for review before adding more");
  }

  const title = (input.title?.trim() || vehicle?.title || "").slice(0, 180);
  if (!title) return fail("Title is required");
  const details = sanitizeVehicleDetails(input.details);
  const startPrice = num(input.startPrice);
  if (!Number.isFinite(startPrice) || startPrice < 1000) return fail("Starting price must be at least ₹1,000");
  const reserve = input.reservePrice == null || input.reservePrice === 0 ? null : num(input.reservePrice);
  if (reserve != null && (!Number.isFinite(reserve) || reserve < startPrice)) return fail("Reserve price can't be below the starting price");
  const increment = input.bidIncrement == null ? Math.max(1000, Math.round(startPrice / 100 / 500) * 500) : num(input.bidIncrement);
  if (!Number.isFinite(increment) || increment < 100) return fail("Bid increment must be at least ₹100");

  const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
  const endsAt = input.endsAt ? new Date(input.endsAt) : new Date(startsAt.getTime() + 24 * 3600_000);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return fail("Invalid start or end time");
  if (endsAt.getTime() <= Date.now()) return fail("End time must be in the future");
  if (endsAt.getTime() - startsAt.getTime() < 10 * 60_000) return fail("Auction must run at least 10 minutes");

  const category =
    organizer && CATEGORIES.has(input.category as AuctionCategory) ? (input.category as AuctionCategory) : "dealer";
  const images = (input.images ?? [])
    .map((u) => String(u).trim())
    .filter((u) => u.startsWith("/uploads/") || /^https:\/\//i.test(u))
    .slice(0, 20);
  const vehicleImages = Array.isArray(vehicle?.images) ? (vehicle!.images as unknown[]).map(String) : [];
  if (!organizer && !vehicle && images.length < 3) return fail("Upload at least 3 clear photos of the vehicle");

  const status: AuctionStatus = !organizer
    ? "pending"
    : startsAt.getTime() <= Date.now()
      ? "live"
      : "upcoming";

  const auction = await prisma.auction.create({
    data: {
      title,
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      vehicleId: vehicle?.id ?? null,
      organizerId: auth.sub,
      startPrice,
      reservePrice: reserve,
      bidIncrement: increment,
      auctionCategory: category,
      status,
      startsAt,
      endsAt,
      location: (input.location?.trim() || vehicle?.city || "India").slice(0, 128),
      images: (images.length ? images : vehicleImages) as Prisma.InputJsonValue,
      metadata: {
        description: input.description?.trim() || null,
        asset_class: ASSET_CLASSES.has(String(input.assetClass)) ? input.assetClass : inferAssetClass(vehicle?.category, title),
        vehicle_details: details,
        submitted_by_role: auth.role,
        approval: organizer ? "approved" : "pending",
      } as Prisma.InputJsonValue,
    },
  });
  emitDbChange("auctions", "INSERT", { new: { id: auction.id, status: auction.status } });
  if (status === "pending") {
    const admins = await prisma.user.findMany({
      where: { role: { in: ["super_admin", "admin"] }, deletedAt: null },
      select: { id: true },
    });
    if (admins.length) {
      await prisma.notification
        .createMany({
          data: admins.map((a) => ({
            userId: a.id,
            title: "Auction lot awaiting approval",
            body: `${title} — starting ₹${startPrice.toLocaleString("en-IN")}`,
            message: `${title} — starting ₹${startPrice.toLocaleString("en-IN")}`,
            kind: "auction",
            payload: { auctionId: auction.id, link: "/dashboard/super-admin/auction-desk" } as Prisma.InputJsonValue,
          })),
        })
        .catch(() => undefined);
    }
  }
  return { ok: true, id: auction.id, slug: auction.slug, status: auction.status };
}

/** Admin approve (→ upcoming/live) or reject (→ cancelled) a pending lot. */
export async function moderateAuctionLot(auth: JwtPayload, auctionId: string, decision: "approve" | "reject", note?: string): Promise<AuctionResult> {
  if (!AUCTION_ADMIN_ROLES.has(auth.role)) return fail("Only admins can approve auctions");
  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction) return fail("Auction not found");
  if (auction.status !== "pending") return fail("Only pending lots can be reviewed");
  const meta = (auction.metadata ?? {}) as Record<string, unknown>;
  let status: AuctionStatus = "cancelled";
  let { startsAt, endsAt } = auction;
  if (decision === "approve") {
    const now = Date.now();
    if (endsAt.getTime() <= now) {
      const span = Math.max(endsAt.getTime() - startsAt.getTime(), 24 * 3600_000);
      startsAt = new Date(now);
      endsAt = new Date(now + span);
    }
    status = startsAt.getTime() <= now ? "live" : "upcoming";
  }
  const updated = await prisma.auction.update({
    where: { id: auctionId },
    data: {
      status,
      startsAt,
      endsAt,
      metadata: { ...meta, approval: decision === "approve" ? "approved" : "rejected", review_note: note ?? null, reviewed_by: auth.sub } as Prisma.InputJsonValue,
    },
  });
  if (auction.organizerId) {
    const n = await prisma.auctionNotification.create({
      data: {
        auctionId,
        userId: auction.organizerId,
        kind: "system",
        title: decision === "approve" ? "Auction approved" : "Auction not approved",
        body: decision === "approve" ? `${auction.title} is ${status === "live" ? "live now" : "scheduled"}.` : `${auction.title} was not approved.${note ? ` ${note}` : ""}`,
      },
    });
    emitNotifications([n]);
    await prisma.notification
      .create({
        data: {
          userId: auction.organizerId,
          title: n.title,
          body: n.body,
          message: n.body,
          kind: "auction",
          payload: { auctionId, link: `/auctions/${status === "cancelled" ? "live" : status}/${auction.slug}` } as Prisma.InputJsonValue,
        },
      })
      .catch(() => undefined);
  }
  emitDbChange("auctions", "UPDATE", { new: auctionRow(updated) });
  return { ok: true, status };
}

/** Signed-in user's auction activity: lots they bid on (with standing) and lots they organised. */
export async function myAuctionActivity(auth: JwtPayload) {
  const myBids = await prisma.auctionBid.findMany({
    where: { bidderId: auth.sub },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { auctionId: true, amount: true },
  });
  const ids = [...new Set(myBids.map((b) => b.auctionId))];
  const [auctions, caps, organised] = await Promise.all([
    ids.length ? prisma.auction.findMany({ where: { id: { in: ids } } }) : Promise.resolve([]),
    prisma.auctionAutoBid.findMany({ where: { bidderId: auth.sub, isActive: true } }),
    prisma.auction.findMany({ where: { organizerId: auth.sub }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const leaders = ids.length
    ? await Promise.all(
        ids.map((auctionId) =>
          prisma.auctionBid.findFirst({ where: { auctionId }, orderBy: [{ amount: "desc" }, { createdAt: "asc" }], select: { auctionId: true, bidderId: true } }),
        ),
      )
    : [];
  const leaderOf = new Map(leaders.filter(Boolean).map((l) => [l!.auctionId, l!.bidderId]));
  const myMax = new Map<string, number>();
  for (const b of myBids) myMax.set(b.auctionId, Math.max(myMax.get(b.auctionId) ?? 0, Number(b.amount)));
  const capOf = new Map(caps.map((c) => [c.auctionId, Number(c.maxAmount)]));

  const lot = (a: (typeof auctions)[number]) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    status: a.status,
    current_bid: a.currentBid != null ? Number(a.currentBid) : null,
    start_price: Number(a.startPrice),
    reserve_price: a.reservePrice != null ? Number(a.reservePrice) : null,
    bid_count: a.bidCount,
    starts_at: a.startsAt.toISOString(),
    ends_at: a.endsAt.toISOString(),
    winner_id: a.winnerId,
    vehicle_id: a.vehicleId,
    metadata: a.metadata,
  });

  return {
    bids: auctions.map((a) => {
      const leading = leaderOf.get(a.id) === auth.sub;
      const standing =
        a.status === "ended" ? (a.winnerId === auth.sub ? "won" : "lost") : leading ? "leading" : "outbid";
      return { ...lot(a), my_bid: myMax.get(a.id) ?? 0, auto_bid_max: capOf.get(a.id) ?? null, standing };
    }),
    organised: organised.map(lot),
  };
}
