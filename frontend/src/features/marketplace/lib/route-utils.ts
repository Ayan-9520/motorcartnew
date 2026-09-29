import type { HubCategorySlug, VehicleConditionSlug } from "../types";
import type { VehicleCategory, VehicleFilters } from "@/types/vehicle";

const HUB_SLUGS: HubCategorySlug[] = [
  "cars",
  "bikes",
  "trucks",
  "buses",
  "auto",
  "equipment",
  "ev",
];

export function parseHubCategorySlug(param?: string): HubCategorySlug | undefined {
  return HUB_SLUGS.includes(param as HubCategorySlug) ? (param as HubCategorySlug) : undefined;
}

export function parseConditionSlug(param?: string): VehicleConditionSlug | undefined {
  return param === "new" || param === "used" ? param : undefined;
}

export type BuyMarketplaceRoute = {
  hub: HubCategorySlug;
  condition: VehicleConditionSlug;
};

/** Read hub + new/used from pathname and optional search params. */
export function parseBuyMarketplaceRoute(
  pathname: string,
  searchParams?: URLSearchParams
): BuyMarketplaceRoute | null {
  if (pathname.startsWith("/new-cars")) {
    return { hub: "cars", condition: "new" };
  }
  if (pathname.startsWith("/used-cars")) {
    return { hub: "cars", condition: "used" };
  }
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "buy" && parts[1] && parts[2]) {
    const hub = parseHubCategorySlug(parts[1]);
    const condition = parseConditionSlug(parts[2]);
    if (hub && condition) return { hub, condition };
  }
  if (parts[0] === "buy" && searchParams) {
    const hub = parseHubCategorySlug(searchParams.get("hub") ?? undefined);
    if (hub) {
      const condition =
        parseConditionSlug(searchParams.get("condition") ?? undefined) ?? "used";
      return { hub, condition };
    }
  }
  return null;
}

export function buyListingPath(hub: HubCategorySlug, condition: VehicleConditionSlug): string {
  return `/buy/${hub}/${condition}`;
}

export function buyDetailPath(
  hub: HubCategorySlug,
  condition: VehicleConditionSlug,
  slug: string
): string {
  return `/buy/${hub}/${condition}/${slug}`;
}

export function sellListingPath(hub: HubCategorySlug): string {
  return `/sell/${hub}`;
}

export function partsHubPath(hub: HubCategorySlug): string {
  return `/parts?hub=${hub}`;
}

export function servicesHubPath(hub: HubCategorySlug): string {
  return `/services?hub=${hub}`;
}

export function sellPageTitle(hub: HubCategorySlug): string {
  const labels: Record<HubCategorySlug, string> = {
    cars: "pre-owned car",
    bikes: "pre-owned bike",
    trucks: "pre-owned truck",
    buses: "pre-owned bus",
    auto: "pre-owned auto",
    equipment: "pre-owned equipment",
    ev: "pre-owned EV",
  };
  return `Sell your ${labels[hub]}`;
}

export type SellFormDefaults = {
  category: string;
  bodyType: string;
  condition: "used";
  owners: number;
  fuelType?: string;
  hubCategory?: HubCategorySlug;
};

export function hubToSellFormDefaults(hub: HubCategorySlug): SellFormDefaults {
  const base: SellFormDefaults = {
    condition: "used",
    owners: 1,
    category: "used-cars",
    bodyType: "SUV",
  };
  switch (hub) {
    case "cars":
      return { ...base, category: "used-cars", bodyType: "SUV" };
    case "bikes":
      return { ...base, category: "bikes", bodyType: "Bike" };
    case "trucks":
      return { ...base, category: "trucks", bodyType: "Truck" };
    case "buses":
      return { ...base, category: "buses", bodyType: "Bus" };
    case "ev":
      return { ...base, category: "ev", bodyType: "SUV", fuelType: "Electric" };
    case "auto":
      return { ...base, category: "used-cars", bodyType: "Auto", hubCategory: "auto" };
    case "equipment":
      return { ...base, category: "trucks", bodyType: "Equipment", hubCategory: "equipment" };
    default:
      return base;
  }
}

export function hubCategoryLabel(hub: HubCategorySlug): string {
  const labels: Record<HubCategorySlug, string> = {
    cars: "Cars",
    bikes: "Bikes",
    trucks: "Trucks",
    buses: "Buses",
    auto: "Auto",
    equipment: "Equipment",
    ev: "EV",
  };
  return labels[hub];
}

export function hubCategoryToFilters(
  hub: HubCategorySlug,
  condition: VehicleConditionSlug
): VehicleFilters {
  const base: VehicleFilters = { condition };

  switch (hub) {
    case "cars":
      return { ...base, category: condition === "new" ? "new-cars" : "used-cars" };
    case "bikes":
      return { ...base, category: "bikes" };
    case "trucks":
      return { ...base, category: "trucks" };
    case "buses":
      return { ...base, category: "buses" };
    case "ev":
      // New-car search forces category new-cars, which would drop the EV fuel rule
      return condition === "new"
        ? { ...base, category: "new-cars", fuel: "electric" }
        : { ...base, category: "ev" };
    case "auto":
      return { ...base, hubCategory: "auto" };
    case "equipment":
      return { ...base, hubCategory: "equipment" };
    default:
      return base;
  }
}

export function hubToVehicleCategory(
  hub: HubCategorySlug,
  condition: VehicleConditionSlug
): VehicleCategory | undefined {
  const filters = hubCategoryToFilters(hub, condition);
  return filters.category;
}

export function listingPageTitle(hub: HubCategorySlug, condition: VehicleConditionSlug): string {
  const cond = condition === "new" ? "New" : "Pre-Owned";
  return `${cond} ${hubCategoryLabel(hub)}`;
}

/** Params that must survive “clear filters” on listing pages */
export const LISTING_ROUTE_PARAM_KEYS = ["type", "hub", "condition", "q"] as const;

export function preserveListingRouteParams(
  current: URLSearchParams,
  category?: string
): URLSearchParams {
  const next = new URLSearchParams();
  for (const key of LISTING_ROUTE_PARAM_KEYS) {
    const v = current.get(key);
    if (v) next.set(key, v);
  }
  if (category && !next.has("type")) next.set("type", category);
  return next;
}
