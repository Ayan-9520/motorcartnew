import { mapDbToListing } from "@/services/vehicle.service";
import { resolveVehicleHero } from "@/lib/media/resolve-images";
import type { DbVehicle } from "@/types/database";
import type { VehicleListing } from "@/types/vehicle";
import type { NewCarListing } from "@/features/new-cars/types";
import type { PreownedCarListing } from "@/features/preowned-cars/types";
import type { HomeAuctionItem, HomeBankItem, HomePartItem } from "@/integrations/api/home";
import { formatCurrency } from "@/lib/utils";
import { auctionDetailPath } from "@/features/auctions/lib/auction-utils";
import { vehicleDetailPath } from "@/lib/vehicle-utils";
import type { HeroDashboardCard } from "@/features/home/data/hero-hub-config";
import type { PartnerLogoItem } from "@/features/home/data/homepage-data";

export function mapHomeVehicles(rows: DbVehicle[]): VehicleListing[] {
  return rows.map((v) => mapDbToListing(v, null));
}

export function asNewCarListings(vehicles: VehicleListing[]): NewCarListing[] {
  return vehicles
    .filter(
      (v) =>
        v.category === "new-cars" ||
        (v.condition === "new" && v.category !== "bikes" && v.category !== "trucks")
    )
    .map((v) => ({ ...v, category: "new-cars" as const, condition: "new" as const }));
}

export function asPreownedListings(vehicles: VehicleListing[]): PreownedCarListing[] {
  return vehicles
    .filter((v) => v.category === "used-cars" || v.condition === "used")
    .map((v) => ({ ...v, category: "used-cars" as const, condition: "used" as const }));
}

export function mapHomeBankToOffer(bank: HomeBankItem) {
  const maxLoan = Number(bank.max_loan_amount);
  const rate = Number(bank.interest_rate_min);
  const emi = Math.round((maxLoan * (rate / 1200) * Math.pow(1 + rate / 1200, 60)) / (Math.pow(1 + rate / 1200, 60) - 1));
  return {
    code: bank.slug,
    name: bank.name,
    logo: bank.logo_url ?? `/partners/banks/${bank.slug}.svg`,
    rate: `${bank.interest_rate_min}%`,
    emi: formatCurrency(emi).replace("₹", "₹"),
    approval: bank.is_featured ? "24h" : "48h",
  };
}

export function mapHomePartToCard(part: HomePartItem) {
  const images = Array.isArray(part.images) ? part.images : [];
  return {
    id: part.id,
    name: part.name,
    category: part.category,
    price: Number(part.price),
    originalPrice: part.original_price ? Number(part.original_price) : undefined,
    rating: Number(part.rating) || 4.5,
    reviewCount: part.review_count || 0,
    image: typeof images[0] === "string" ? images[0] : "/placeholder-part.jpg",
  };
}

export function mapHomeAuctionToCard(auction: HomeAuctionItem) {
  return {
    id: auction.id,
    title: auction.title,
    image: auction.image ?? "/placeholder-auction.jpg",
    endsAt: auction.ends_at,
    location: auction.location ?? "India",
    bidCount: auction.bid_count ?? 0,
    currentBid: auction.current_bid,
    startingBid: auction.starting_bid,
    slug: auction.slug,
  };
}

export function mapHomeBankToLoanProduct(bank: HomeBankItem) {
  const features = Array.isArray(bank.features)
    ? bank.features.map(String)
    : [];
  return {
    id: bank.id,
    bank_name: bank.name,
    interest_rate_min: Number(bank.interest_rate_min),
    interest_rate_max: Number(bank.interest_rate_max),
    max_loan_amount: Number(bank.max_loan_amount),
    tenure_max_months: bank.max_tenure_months,
    features,
    is_featured: bank.is_featured,
  };
}

function formatAuctionTimeLeft(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return "Ending soon";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} left`;
}

export { formatAuctionTimeLeft };

function heroListingImage(vehicle: VehicleListing): string {
  return resolveVehicleHero(
    vehicle.brand,
    vehicle.model,
    vehicle.bodyType,
    vehicle.images,
    0,
    { category: vehicle.category, fuelType: vehicle.fuelType }
  );
}

export type HeroDashboardPool = {
  listings: HeroDashboardCard[];
  auctions: HeroDashboardCard[];
  loans: HeroDashboardCard[];
  community: HeroDashboardCard[];
  tags: string[];
  panelTitle: string;
  dealerCount?: string;
  liveAuctionCount: number;
  listingCount: number;
};

export function buildHeroDashboardPool(input: {
  featuredVehicles: VehicleListing[];
  auctions: ReturnType<typeof mapHomeAuctionToCard>[];
  loanProducts: ReturnType<typeof mapHomeBankToLoanProduct>[];
  communityPosts: Array<{ title: string; author: string; replies: number; href?: string }>;
  heroStats: Array<{ label: string; value: string; href?: string }>;
}): HeroDashboardPool | null {
  const listings: HeroDashboardCard[] = input.featuredVehicles.map((vehicle) => ({
    type: "listing" as const,
    title: `${vehicle.brand} ${vehicle.model}`.trim(),
    price: vehicle.price,
    meta: `${vehicle.isCertified ? "Certified" : "Listed"} · ${vehicle.city ?? "India"}`,
    href: vehicleDetailPath(vehicle),
    image: heroListingImage(vehicle),
    badge: vehicle.condition === "new" ? "New" : "Pre-owned",
  }));

  const auctions: HeroDashboardCard[] = input.auctions.slice(0, 4).map((auction) => ({
    type: "auction" as const,
    title: auction.title,
    price: auction.currentBid ?? auction.startingBid,
    meta: `${formatAuctionTimeLeft(auction.endsAt)} · ${auction.bidCount} bids`,
    href: auctionDetailPath(auction),
    badge: "LIVE",
    live: true,
    endsAt: auction.endsAt,
    bidCount: auction.bidCount,
  }));

  const loans: HeroDashboardCard[] = input.loanProducts.slice(0, 3).map((loan) => ({
    type: "loan" as const,
    title: "Loan pre-approved",
    price: loan.max_loan_amount,
    meta: `${loan.bank_name} · ${loan.interest_rate_min}% · Bank partner`,
    href: "/finance",
  }));

  const community: HeroDashboardCard[] = input.communityPosts.slice(0, 3).map((post) => ({
    type: "ai" as const,
    title: post.title.slice(0, 48) + (post.title.length > 48 ? "…" : ""),
    subtitle: `${post.author} · ${post.replies} replies`,
    href: post.href ?? "/community",
  }));

  if (!listings.length && !auctions.length && !loans.length) return null;

  const tags = input.heroStats.slice(0, 4).map((s) => `${s.value} ${s.label.toLowerCase()}`);
  const dealerStat = input.heroStats.find((s) => s.label.toLowerCase().includes("dealer"));
  const auctionStat = input.heroStats.find((s) => s.label.toLowerCase().includes("auction"));

  return {
    listings,
    auctions,
    loans,
    community,
    tags: tags.length
      ? tags
      : [
          auctionStat ? `${auctionStat.value} live auctions` : `${input.auctions.length} live auctions`,
          dealerStat ? `${dealerStat.value} verified dealers` : "Verified dealers",
          "Bank-grade finance",
          "Owner community",
        ],
    panelTitle: "India vehicle ecosystem",
    dealerCount: dealerStat?.value,
    liveAuctionCount: input.auctions.length,
    listingCount: input.featuredVehicles.length,
  };
}

export function buildLiveHeroDashboard(input: {
  featuredVehicles: VehicleListing[];
  auctions: ReturnType<typeof mapHomeAuctionToCard>[];
  loanProducts: ReturnType<typeof mapHomeBankToLoanProduct>[];
  communityPosts: Array<{ title: string; author: string; replies: number; href?: string }>;
  heroStats: Array<{ label: string; value: string; href?: string }>;
}): { cards: HeroDashboardCard[]; tags: string[]; panelTitle: string; dealerCount?: string } | null {
  const pool = buildHeroDashboardPool(input);
  if (!pool) return null;

  const cards: HeroDashboardCard[] = [];
  if (pool.listings[0]) cards.push(pool.listings[0]);
  if (pool.auctions[0]) cards.push(pool.auctions[0]);
  if (pool.loans[0]) cards.push(pool.loans[0]);
  if (pool.community[0]) cards.push(pool.community[0]);

  return {
    cards,
    tags: pool.tags,
    panelTitle: pool.panelTitle,
    dealerCount: pool.dealerCount,
  };
}

export function mapBanksToPartnerLogos(
  banks: Array<{ code: string; name: string; logo: string }>
): PartnerLogoItem[] {
  return banks.map((b) => ({
    id: b.code,
    name: b.name,
    logo: b.logo,
    href: `/finance?bank=${encodeURIComponent(b.code)}`,
  }));
}

export function mapBrandsToPartnerLogos(
  brands: Array<{ name: string; slug: string }>
): PartnerLogoItem[] {
  return brands.map((b) => ({
    id: b.slug,
    name: b.name,
    logo: `/partners/cars/${b.slug}.svg`,
    href: `/vehicles?brand=${encodeURIComponent(b.slug)}`,
  }));
}
