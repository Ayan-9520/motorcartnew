import type {
  FairPriceLabel,
  VehicleCategory,
  VehicleFilters,
  VehicleListing,
  VehicleSortOption,
} from "@/types/vehicle";
import type { HubCategorySlug, VehicleConditionSlug } from "@/features/marketplace/types";
import { buyDetailPath, buyListingPath } from "@/features/marketplace/lib/route-utils";
import { inferVehicleSegment } from "@/lib/media/vehicle-media-registry";

const CATEGORY_MAP: Record<VehicleCategory, { condition?: string; fuel?: string; bodyTypes?: string[] }> = {
  "new-cars": { condition: "new" },
  "used-cars": { condition: "used" },
  bikes: { bodyTypes: ["bike", "scooter"] },
  trucks: { bodyTypes: ["truck", "pickup", "lcv"] },
  buses: { bodyTypes: ["bus", "minibus"] },
  ev: { fuel: "electric" },
};

export function categoryToPath(category: VehicleCategory): string {
  if (category === "new-cars") return "/new-cars/browse";
  if (category === "used-cars") return "/used-cars/browse";
  return `/vehicles/${category}`;
}

export function newCarDetailPath(slug: string): string {
  return `/new-cars/${slug}`;
}

export function preownedDetailPath(slug: string): string {
  return `/used-cars/${slug}`;
}

/** Map listing → canonical buy hub + condition */
export function inferBuyHubFromVehicle(
  vehicle: Pick<VehicleListing, "slug" | "category" | "bodyType" | "condition" | "fuelType">
): { hub: HubCategorySlug; condition: VehicleConditionSlug } {
  const seg = inferVehicleSegment({
    brand: "",
    model: "",
    bodyType: vehicle.bodyType,
    category: vehicle.category,
    fuelType: vehicle.fuelType,
  });

  const hubMap: Record<string, HubCategorySlug> = {
    cars: "cars",
    bikes: "bikes",
    trucks: "trucks",
    buses: "buses",
    ev: "ev",
    auto: "auto",
    equipment: "equipment",
  };

  const hub = hubMap[seg] ?? "cars";
  // New-car inventory (ncd-*) and explicit new flags always stay under New — never Pre-Owned
  const isNew =
    /^ncd-/i.test(vehicle.slug ?? "") ||
    vehicle.condition === "new" ||
    vehicle.category === "new-cars";
  let condition: VehicleConditionSlug = isNew ? "new" : "used";

  if (hub === "cars" && !isNew) {
    if (vehicle.category === "used-cars") condition = "used";
  }

  if (hub === "auto" || hub === "equipment") {
    condition = isNew ? "new" : "used";
  }

  return { hub, condition };
}

/** Canonical marketplace detail URL */
export function vehicleDetailPath(
  vehicle: Pick<VehicleListing, "slug" | "category" | "bodyType" | "condition" | "fuelType">
): string {
  const { hub, condition } = inferBuyHubFromVehicle(vehicle);
  return buyDetailPath(hub, condition, vehicle.slug);
}

/** Listing index for breadcrumbs */
export function vehicleListingPath(
  vehicle: Pick<VehicleListing, "slug" | "category" | "bodyType" | "condition" | "fuelType">
): string {
  const { hub, condition } = inferBuyHubFromVehicle(vehicle);
  return buyListingPath(hub, condition);
}

export function getFairPriceLabel(vehicle: VehicleListing): FairPriceLabel | undefined {
  return vehicle.metadata.fairPriceLabel;
}

export function deriveFairPriceLabel(vehicle: VehicleListing): FairPriceLabel {
  const score = vehicle.aiPriceScore ?? 75;
  if (score >= 90) return "great-deal";
  if (score >= 78) return "fair-price";
  return "high-price";
}

export function parseCategoryParam(param?: string): VehicleCategory | undefined {
  const valid: VehicleCategory[] = ["new-cars", "used-cars", "bikes", "trucks", "buses", "ev"];
  return valid.includes(param as VehicleCategory) ? (param as VehicleCategory) : undefined;
}

export function calculateEmi(principal: number, annualRate: number, tenureMonths: number): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  const r = annualRate / 12 / 100;
  if (r === 0) return Math.round(principal / tenureMonths);
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  return Math.round(emi);
}

export function estimateLoanEligibility(monthlyIncome: number, existingEmi = 0): {
  eligible: boolean;
  maxLoan: number;
  maxEmi: number;
  message: string;
} {
  const maxEmi = Math.max(0, monthlyIncome * 0.5 - existingEmi);
  const maxLoan = Math.round(maxEmi * 60 * 0.92);
  const eligible = monthlyIncome >= 25000 && maxEmi >= 5000;
  return {
    eligible,
    maxLoan,
    maxEmi: Math.round(maxEmi),
    message: eligible
      ? `You may qualify for loans up to ₹${(maxLoan / 100000).toFixed(1)}L based on income.`
      : "Increase income or reduce existing EMIs to improve eligibility.",
  };
}

export function getDiscountedPrice(vehicle: VehicleListing): number {
  const pct = vehicle.metadata.discountPercent ?? 0;
  if (pct <= 0) return vehicle.price;
  return Math.round(vehicle.price * (1 - pct / 100));
}

export function getVehicleEmi(vehicle: VehicleListing, tenureMonths = 60): number {
  const rate = vehicle.metadata.emiRate ?? 9.5;
  const principal = getDiscountedPrice(vehicle) * 0.85;
  return calculateEmi(principal, rate, tenureMonths);
}

export function whatsAppVehicleUrl(vehicle: VehicleListing, phone?: string): string {
  const num = (phone ?? vehicle.dealerPhone ?? "919876543210").replace(/\D/g, "");
  const text = encodeURIComponent(
    `Hi, I'm interested in ${vehicle.title} listed on Motorcart.in at ${formatPrice(vehicle.price)}. Link: ${window.location.origin}${vehicleDetailPath(vehicle)}`
  );
  return `https://wa.me/${num}?text=${text}`;
}

export function formatPrice(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function filterVehicles(
  vehicles: VehicleListing[],
  filters: VehicleFilters
): VehicleListing[] {
  let result = [...vehicles];

  if (filters.condition) {
    result = result.filter((v) => v.condition === filters.condition);
  }

  if (filters.hubCategory === "auto") {
    result = result.filter((v) =>
      ["auto", "rickshaw", "three-wheeler", "three wheeler"].some((t) =>
        v.bodyType.toLowerCase().includes(t)
      )
    );
  }

  if (filters.hubCategory === "equipment") {
    result = result.filter((v) =>
      ["equipment", "tractor", "excavator", "loader", "crane", "forklift", "harvester"].some((t) =>
        v.bodyType.toLowerCase().includes(t)
      )
    );
  }

  if (filters.category) {
    const rule = CATEGORY_MAP[filters.category];
    if (rule.condition) result = result.filter((v) => v.condition === rule.condition);
    if (rule.fuel) result = result.filter((v) => v.fuelType.toLowerCase() === rule.fuel);
    if (rule.bodyTypes) {
      result = result.filter((v) =>
        rule.bodyTypes!.some((b) => v.bodyType.toLowerCase().includes(b))
      );
    }
    if (filters.category !== "ev" && filters.category !== "new-cars" && filters.category !== "used-cars") {
      result = result.filter((v) => v.category === filters.category);
    }
    if (filters.category === "new-cars") result = result.filter((v) => v.category === "new-cars" || v.condition === "new");
    if (filters.category === "used-cars") result = result.filter((v) => v.category === "used-cars" || (v.condition === "used" && !["bikes", "trucks", "buses", "ev"].includes(v.category)));
  }

  if (filters.brand) result = result.filter((v) => v.brand.toLowerCase() === filters.brand!.toLowerCase());
  if (filters.model) result = result.filter((v) => v.model.toLowerCase().includes(filters.model!.toLowerCase()));
  if (filters.variant) {
    result = result.filter((v) => (v.variant ?? "").toLowerCase().includes(filters.variant!.toLowerCase()));
  }
  if (filters.fuel) result = result.filter((v) => v.fuelType.toLowerCase() === filters.fuel!.toLowerCase());
  if (filters.transmission) result = result.filter((v) => v.transmission.toLowerCase() === filters.transmission!.toLowerCase());
  if (filters.priceMin != null) result = result.filter((v) => getDiscountedPrice(v) >= filters.priceMin!);
  if (filters.priceMax != null) result = result.filter((v) => getDiscountedPrice(v) <= filters.priceMax!);
  if (filters.yearMin != null) result = result.filter((v) => v.year >= filters.yearMin!);
  if (filters.yearMax != null) result = result.filter((v) => v.year <= filters.yearMax!);
  if (filters.kmsMax != null) result = result.filter((v) => v.kmsDriven <= filters.kmsMax!);
  if (filters.owners != null) result = result.filter((v) => v.owners <= filters.owners!);
  if (filters.city) result = result.filter((v) => v.city.toLowerCase() === filters.city!.toLowerCase());
  if (filters.color) result = result.filter((v) => (v.color ?? "").toLowerCase() === filters.color!.toLowerCase());
  if (filters.bodyType) result = result.filter((v) => v.bodyType.toLowerCase() === filters.bodyType!.toLowerCase());
  if (filters.saleMode) {
    result = result.filter((v) => (v.saleMode ?? "dealer_offer") === filters.saleMode);
  }
  if (filters.emiMax != null) {
    result = result.filter((v) => getVehicleEmi(v) <= filters.emiMax!);
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    result = result.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        (v.location?.toLowerCase().includes(q) ?? false) ||
        (v.dealerName?.toLowerCase().includes(q) ?? false) ||
        (v.description?.toLowerCase().includes(q) ?? false)
    );
  }

  return result;
}

export function sortVehicles(vehicles: VehicleListing[], sort: VehicleSortOption): VehicleListing[] {
  const sorted = [...vehicles];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => getDiscountedPrice(a) - getDiscountedPrice(b));
    case "price-desc":
      return sorted.sort((a, b) => getDiscountedPrice(b) - getDiscountedPrice(a));
    case "year-desc":
      return sorted.sort((a, b) => b.year - a.year);
    case "kms-asc":
      return sorted.sort((a, b) => a.kmsDriven - b.kmsDriven);
    case "ai-score":
      return sorted.sort((a, b) => (b.aiPriceScore ?? 0) - (a.aiPriceScore ?? 0));
    case "newest":
    default:
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export function paginateVehicles<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function getSimilarVehicles(vehicle: VehicleListing, all: VehicleListing[], limit = 4): VehicleListing[] {
  return all
    .filter((v) => v.id !== vehicle.id && v.status === "available")
    .map((v) => {
      let score = 0;
      if (v.brand === vehicle.brand) score += 3;
      if (v.category === vehicle.category) score += 2;
      if (v.bodyType === vehicle.bodyType) score += 1;
      if (Math.abs(v.price - vehicle.price) / vehicle.price < 0.25) score += 2;
      return { v, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ v }) => v);
}

export function getAIRecommendations(
  recentIds: string[],
  wishlistIds: string[],
  all: VehicleListing[],
  limit = 6
): VehicleListing[] {
  const viewed = all.filter((v) => recentIds.includes(v.id));
  const brands = new Set(viewed.map((v) => v.brand));
  const categories = new Set(viewed.map((v) => v.category));
  const avgPrice = viewed.length
    ? viewed.reduce((s, v) => s + v.price, 0) / viewed.length
    : 1000000;

  return all
    .filter((v) => v.status === "available" && !recentIds.includes(v.id) && !wishlistIds.includes(v.id))
    .map((v) => {
      let score = v.aiPriceScore ?? 70;
      if (brands.has(v.brand)) score += 15;
      if (categories.has(v.category)) score += 10;
      if (v.isFeatured) score += 8;
      if (Math.abs(v.price - avgPrice) / avgPrice < 0.3) score += 12;
      return { v, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ v }) => v);
}

export function filtersFromSearchParams(params: URLSearchParams): VehicleFilters {
  const hub = params.get("hub") as VehicleFilters["hubCategory"] | null;
  const condition = params.get("condition") as VehicleFilters["condition"] | null;

  return {
    category: parseCategoryParam(params.get("type") ?? params.get("category") ?? undefined),
    hubCategory: hub === "auto" || hub === "equipment" ? hub : undefined,
    condition: condition === "new" || condition === "used" ? condition : undefined,
    brand: params.get("brand") ?? undefined,
    model: params.get("model") ?? undefined,
    variant: params.get("variant") ?? undefined,
    fuel: params.get("fuel") ?? undefined,
    transmission: params.get("transmission") ?? undefined,
    priceMin: params.get("priceMin") ? Number(params.get("priceMin")) : undefined,
    priceMax: params.get("priceMax") ? Number(params.get("priceMax")) : undefined,
    yearMin: params.get("yearMin") ? Number(params.get("yearMin")) : undefined,
    yearMax: params.get("yearMax") ? Number(params.get("yearMax")) : undefined,
    kmsMax: params.get("kmsMax") ? Number(params.get("kmsMax")) : undefined,
    owners: params.get("owners") ? Number(params.get("owners")) : undefined,
    city: params.get("city") ?? undefined,
    color: params.get("color") ?? undefined,
    bodyType: params.get("bodyType") ?? undefined,
    emiMax: params.get("emiMax") ? Number(params.get("emiMax")) : undefined,
    q: params.get("q") ?? undefined,
  };
}
