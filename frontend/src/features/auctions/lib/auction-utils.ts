import type { AuctionListing, AuctionType } from "../types";
import type { DbAuction } from "@/types/database";
import { resolveAuctionImages } from "@/lib/media/resolve-images";

export function slugifyAuction(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const AUCTION_ASSET_CLASSES = [
  { id: "cars", label: "4 Wheelers (cars, SUVs)" },
  { id: "commercial", label: "Commercial vehicles (trucks, tippers)" },
  { id: "two-wheelers", label: "2 Wheelers" },
  { id: "buses", label: "Buses & coaches" },
  { id: "tractors", label: "Tractors & farm" },
  { id: "construction", label: "Construction equipment" },
  { id: "real-estate", label: "Real estate (plots, property)" },
] as const;

const ASSET_CLASS_IDS = new Set<string>(AUCTION_ASSET_CLASSES.map((c) => c.id));

/** Asset class saved on the lot (`metadata.asset_class`), else inferred from the title. */
export function auctionAssetClass(a: Pick<AuctionListing, "title" | "metadata">): string {
  const saved = String(a.metadata?.asset_class ?? "");
  if (ASSET_CLASS_IDS.has(saved)) return saved;
  const t = a.title.toLowerCase();
  if (/\b(tractor|harvester|rotavator)\b/.test(t)) return "tractors";
  if (/\b(jcb|excavator|crane|loader|mixer|backhoe|dozer)\b/.test(t)) return "construction";
  if (/\b(truck|tipper|trailer|pickup|tempo|lcv|hcv)\b/.test(t)) return "commercial";
  if (/\b(bus|coach)\b/.test(t)) return "buses";
  if (/\b(bike|scooter|motorcycle|activa|splendor|pulsar|royal enfield)\b/.test(t)) return "two-wheelers";
  if (/\b(plot|flat|land|shop|property|villa|apartment)\b/.test(t)) return "real-estate";
  return "cars";
}

const CATEGORY_TO_TYPE: Record<string, AuctionType> = {
  dealer: "dealer",
  bank: "bank_repo",
  bank_repo: "bank_repo",
  government: "government",
  insurance: "insurance",
  fleet: "fleet",
};

export function mapDbAuction(a: DbAuction): AuctionListing {
  const category = String(a.auction_category ?? a.auction_type ?? "dealer");
  return {
    id: a.id,
    slug: a.slug ?? slugifyAuction(a.title),
    vehicleId: a.vehicle_id,
    organizerId: a.organizer_id,
    title: a.title,
    images: resolveAuctionImages(a.title, a.images),
    startingBid: Number(a.start_price ?? a.starting_bid ?? 0),
    currentBid: a.current_bid != null ? Number(a.current_bid) : null,
    reservePrice: a.reserve_price != null ? Number(a.reserve_price) : null,
    bidIncrement: Number(a.bid_increment) || 1000,
    bidCount: Number(a.bid_count ?? 0),
    auctionType: CATEGORY_TO_TYPE[category] ?? "dealer",
    location: a.location ?? "India",
    startsAt: a.starts_at,
    endsAt: a.ends_at,
    status: a.status,
    winnerId: a.winner_id,
    isFeatured: a.is_featured ?? false,
    viewerCount: a.viewer_count ?? 0,
    metadata: (a.metadata as Record<string, unknown>) ?? {},
    createdAt: a.created_at,
  };
}

/** First bid may equal the starting price; after that each bid adds one increment. Mirrors the server. */
export function getMinNextBid(
  auction: Pick<AuctionListing, "currentBid" | "startingBid" | "bidIncrement"> & { bidCount?: number }
): number {
  if (auction.currentBid == null || auction.bidCount === 0) return auction.startingBid;
  return auction.currentBid + auction.bidIncrement;
}

export function getTimeLeft(endsAt: string): number {
  return Math.max(0, new Date(endsAt).getTime() - Date.now());
}

export function formatCountdown(ms: number): { hours: number; minutes: number; seconds: number; expired: boolean } {
  if (ms <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return { hours, minutes, seconds, expired: false };
}

export function isReserveMet(auction: Pick<AuctionListing, "currentBid" | "reservePrice">): boolean {
  if (auction.reservePrice == null) return true;
  return (auction.currentBid ?? 0) >= auction.reservePrice;
}

type AuctionPathInput = {
  slug?: string;
  id?: string;
  status?: string;
};

/** Room URL — `/auctions/{status}/{slug}`. Falls back to id when slug missing. */
export function auctionDetailPath(auction: AuctionPathInput): string {
  const slug = auction.slug?.trim() || auction.id;
  if (!slug) return "/auctions";
  const status =
    !auction.status || auction.status === "live" ? "live" : auction.status;
  return `/auctions/${status}/${slug}`;
}
