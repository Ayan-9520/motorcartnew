import { prisma } from "@/lib/prisma";
import { toSnakeRow } from "@/lib/db/table-map";

const HOME_VEHICLE_INCLUDE = {
  dealer: { select: { name: true, slug: true, phone: true, rating: true, isVerified: true } },
} as const;

const HOME_LISTING_LIMIT = 200;

const DEALER_ROLES = [
  "dealer",
  "used_car_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
] as const;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 100_000) return `${Math.floor(n / 100_000)}L+`;
  if (n >= 10_000) return `${Math.floor(n / 1000)}K+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K+`;
  return `${n}+`;
}

function formatInrCompact(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr+`;
  if (n >= 100_000) return `₹${Math.round(n / 100_000)}L+`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export type HomePagePayload = {
  generated_at: string;
  stats: {
    vehicles: number;
    dealers: number;
    live_auctions: number;
    banks: number;
    parts: number;
    users: number;
    community_posts: number;
    service_centers: number;
  };
  hero_stats: Array<{ label: string; value: string; href: string }>;
  platform_stats: Array<{ label: string; value: string }>;
  banners: Record<string, unknown>[];
  featured_vehicles: Record<string, unknown>[];
  new_cars: Record<string, unknown>[];
  preowned_cars: Record<string, unknown>[];
  auctions: Record<string, unknown>[];
  banks: Record<string, unknown>[];
  insurance_partners: Record<string, unknown>[];
  parts: Record<string, unknown>[];
  community_posts: Array<{
    id: string;
    title: string;
    author: string;
    tag: string;
    replies: number;
    href: string;
  }>;
  services: Record<string, unknown>[];
  testimonials: Array<{
    id: string;
    name: string;
    role: string;
    text: string;
    rating: number;
  }>;
  brands: Array<{ name: string; slug: string; count: number }>;
};

export async function getHomePageData(): Promise<HomePagePayload> {
  const [
    vehicleCount,
    dealerCount,
    liveAuctionCount,
    bankCount,
    partCount,
    userCount,
    communityPostCount,
    serviceCenterCount,
    banners,
    featuredVehicles,
    newCarRows,
    preownedRows,
    liveAuctions,
    banks,
    insurancePartners,
    parts,
    socialPosts,
    legacyPosts,
    serviceCatalog,
    reviews,
    brandGroups,
  ] = await Promise.all([
    safe(() => prisma.vehicle.count({ where: { deletedAt: null, status: "available" } }), 0),
    safe(
      () =>
        prisma.dealer
          .count({ where: { deletedAt: null } })
          .catch(() => prisma.user.count({ where: { role: { in: [...DEALER_ROLES] } } })),
      0
    ),
    safe(() => prisma.auction.count({ where: { status: "live" } }), 0),
    safe(() => prisma.bank.count({ where: { isActive: true } }), 0),
    safe(() => prisma.part.count({ where: { isActive: true } }), 0),
    safe(() => prisma.user.count({ where: { deletedAt: null } }), 0),
    safe(
      () =>
        prisma.socialPost
          .count({ where: { deletedAt: null, moderationStatus: "approved" } })
          .catch(() => prisma.communityPost.count({ where: { deletedAt: null } })),
      0
    ),
    safe(() => prisma.serviceCenter.count(), 0),
    safe(
      () =>
        prisma.cmsBanner.findMany({
          where: { isActive: true, position: { in: ["home", "homepage", "hero"] } },
          orderBy: { sortOrder: "asc" },
          take: 6,
        }),
      []
    ),
    safe(
      () =>
        prisma.vehicle.findMany({
          where: { deletedAt: null, status: "available" },
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          take: HOME_LISTING_LIMIT,
          include: HOME_VEHICLE_INCLUDE,
        }),
      []
    ),
    safe(
      () =>
        prisma.vehicle.findMany({
          where: {
            deletedAt: null,
            status: "available",
            OR: [{ category: "new-cars" }, { condition: "new" }],
          },
          orderBy: { createdAt: "desc" },
          take: HOME_LISTING_LIMIT,
          include: HOME_VEHICLE_INCLUDE,
        }),
      []
    ),
    safe(
      () =>
        prisma.vehicle.findMany({
          where: {
            deletedAt: null,
            status: "available",
            OR: [{ category: "used-cars" }, { condition: "used" }],
          },
          orderBy: [{ isCertified: "desc" }, { createdAt: "desc" }],
          take: HOME_LISTING_LIMIT,
          include: HOME_VEHICLE_INCLUDE,
        }),
      []
    ),
    safe(
      () =>
        prisma.auction.findMany({
          where: { status: "live" },
          orderBy: { endsAt: "asc" },
          take: 24,
        }),
      []
    ),
    safe(
      () =>
        prisma.bank.findMany({
          where: { isActive: true },
          orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
          take: 24,
        }),
      []
    ),
    safe(
      () =>
        prisma.insurancePartner.findMany({
          where: { isActive: true },
          take: 12,
        }),
      []
    ),
    safe(
      () =>
        prisma.part.findMany({
          where: { isActive: true },
          orderBy: [{ isFeatured: "desc" }, { reviewCount: "desc" }],
          take: 24,
        }),
      []
    ),
    safe(
      () =>
        prisma.socialPost
          .findMany({
            where: { deletedAt: null, moderationStatus: "approved" },
            orderBy: { createdAt: "desc" },
            take: 4,
            include: { author: { select: { fullName: true, email: true } } },
          })
          .catch(() => []),
      []
    ),
    safe(
      () =>
        prisma.communityPost
          .findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 4,
            include: { author: { select: { fullName: true, email: true } } },
          })
          .catch(() => []),
      []
    ),
    safe(
      () =>
        prisma.serviceCatalog.findMany({
          orderBy: { priceFrom: "asc" },
          take: 4,
        }),
      []
    ),
    safe(
      () =>
        prisma.review.findMany({
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
      []
    ),
    safe(
      () =>
        prisma.vehicle.groupBy({
          by: ["brand"],
          where: { deletedAt: null, status: "available" },
          _count: { brand: true },
          orderBy: { _count: { brand: "desc" } },
          take: 12,
        }),
      []
    ),
  ]);

  const mapVehicle = (v: (typeof featuredVehicles)[number]) => {
    const row = toSnakeRow(v as unknown as Record<string, unknown>);
    const dealer = v.dealer;
    if (dealer) {
      row.dealer_name = dealer.name;
      row.dealer_slug = dealer.slug;
      if ("phone" in dealer) row.dealer_phone = dealer.phone;
      if ("rating" in dealer) row.dealer_rating = Number(dealer.rating);
      if ("isVerified" in dealer) row.dealer_verified = dealer.isVerified;
    }
    return row;
  };

  let featuredList = featuredVehicles;

  const posts =
    socialPosts.length > 0
      ? socialPosts.map((p) => ({
          id: p.id,
          title: p.content.slice(0, 120) + (p.content.length > 120 ? "…" : ""),
          author: p.author.fullName ?? p.author.email ?? "Member",
          tag: String(p.postKind ?? "discussion").replace(/_/g, " "),
          replies: p.commentCount,
          href: `/community/post/${p.id}`,
        }))
      : legacyPosts.map((p) => ({
          id: p.id,
          title: p.content.slice(0, 120) + (p.content.length > 120 ? "…" : ""),
          author: p.author.fullName ?? p.author.email ?? "Member",
          tag: "community",
          replies: p.likes,
          href: "/community",
        }));

  const auctionRows = liveAuctions.map((a) => {
    const row = toSnakeRow(a as unknown as Record<string, unknown>);
    const images = Array.isArray(a.images) ? a.images : [];
    row.image = typeof images[0] === "string" ? images[0] : null;
    row.starting_bid = Number(a.startPrice);
    row.current_bid = a.currentBid != null ? Number(a.currentBid) : Number(a.startPrice);
    return row;
  });

  const testimonialRows = reviews
    .filter((r) => r.comment || r.title)
    .map((r) => ({
      id: r.id,
      name: "Motorcart customer",
      role: "Verified buyer",
      text: r.comment ?? r.title ?? "",
      rating: Math.min(5, Math.max(1, r.rating)),
    }));

  const totalListings = Math.max(vehicleCount, featuredList.length);

  return {
    generated_at: new Date().toISOString(),
    stats: {
      vehicles: vehicleCount,
      dealers: dealerCount,
      live_auctions: liveAuctionCount,
      banks: bankCount,
      parts: partCount,
      users: userCount,
      community_posts: communityPostCount,
      service_centers: serviceCenterCount,
    },
    hero_stats: [
      { label: "Live listings", value: formatCount(totalListings), href: "/buy" },
      { label: "Verified dealers", value: formatCount(dealerCount), href: "/dealers" },
      { label: "Live auctions", value: formatCount(liveAuctionCount), href: "/auctions" },
      { label: "Finance partners", value: formatCount(bankCount), href: "/finance" },
      { label: "Community posts", value: formatCount(communityPostCount), href: "/community" },
      { label: "Auto parts", value: formatCount(partCount), href: "/parts" },
    ],
    platform_stats: [
      { label: "Vehicles listed", value: formatCount(totalListings) },
      { label: "Dealer partners", value: formatCount(dealerCount) },
      { label: "Loans facilitated", value: formatInrCompact(Math.max(bankCount * 250_000, 0)) },
      { label: "Happy users", value: formatCount(userCount) },
    ],
    banners: banners.map((b) => toSnakeRow(b as unknown as Record<string, unknown>)),
    featured_vehicles: featuredList.map(mapVehicle),
    new_cars: newCarRows.map((v) => mapVehicle(v as (typeof featuredVehicles)[number])),
    preowned_cars: preownedRows.map((v) => mapVehicle(v as (typeof featuredVehicles)[number])),
    auctions: auctionRows,
    banks: banks.map((b) => toSnakeRow(b as unknown as Record<string, unknown>)),
    insurance_partners: insurancePartners.map((p) =>
      toSnakeRow(p as unknown as Record<string, unknown>)
    ),
    parts: parts.map((p) => toSnakeRow(p as unknown as Record<string, unknown>)),
    community_posts: posts,
    services: serviceCatalog.map((s) => toSnakeRow(s as unknown as Record<string, unknown>)),
    testimonials: testimonialRows,
    brands: brandGroups.map((g) => ({
      name: g.brand,
      slug: g.brand.toLowerCase().replace(/\s+/g, "-"),
      count: g._count.brand,
    })),
  };
}
