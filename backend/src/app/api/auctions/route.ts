import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err, unauthorized } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { getAuthUser } from "@/lib/auth/middleware";
import { isPendingBusinessAccess, loadUserAccess } from "@/lib/auth/account-access";
import { createAuctionLot, sweepAuctionStatuses, type CreateAuctionInput } from "@/lib/auctions/auction-engine";

const PUBLIC_STATUSES = new Set(["live", "upcoming", "ended"]);

export async function GET(req: NextRequest) {
  await sweepAuctionStatuses();
  const status = req.nextUrl.searchParams.get("status");
  const auctions = await prisma.auction.findMany({
    where: status && PUBLIC_STATUSES.has(status)
      ? { status: status as "live" | "upcoming" | "ended" }
      : { status: { in: ["live", "upcoming", "ended"] } },
    orderBy: { startsAt: "desc" },
    take: 50,
  });
  return ok({ data: auctions.map((a) => toSnakeRow(a as unknown as Record<string, unknown>)) });
}

/** Create a lot. Admin / auction partner → scheduled; dealer / customer (own vehicle) → pending approval. */
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const access = await loadUserAccess(auth.sub);
  if (access && isPendingBusinessAccess(access)) return err("Account pending admin approval", 403);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const input: CreateAuctionInput = {
    title: body.title as string | undefined,
    vehicleId: (body.vehicle_id ?? body.vehicleId) as string | undefined,
    startPrice: Number(body.start_price ?? body.startPrice),
    reservePrice:
      body.reserve_price == null && body.reservePrice == null ? null : Number(body.reserve_price ?? body.reservePrice),
    bidIncrement:
      body.bid_increment == null && body.bidIncrement == null ? undefined : Number(body.bid_increment ?? body.bidIncrement),
    startsAt: (body.starts_at ?? body.startsAt) as string | undefined,
    endsAt: (body.ends_at ?? body.endsAt) as string | undefined,
    location: body.location as string | undefined,
    images: Array.isArray(body.images) ? (body.images as string[]) : undefined,
    category: (body.category ?? body.auction_category) as string | undefined,
    description: body.description as string | undefined,
    assetClass: (body.asset_class ?? body.assetClass) as string | undefined,
  };
  try {
    const result = await createAuctionLot(auth, input);
    if (!result.ok) return err(result.error ?? "Could not create auction", 400);
    return ok({ data: result });
  } catch (e) {
    console.error("[auctions:create]", e);
    return err("Could not create auction", 500);
  }
}
