import { MOCK_VEHICLES } from "@/data/vehicle-catalog";
import { realDataOnly } from "@/config/real-data";
import { api } from "@/lib/api/axios";
import { hasConfiguredApi } from "@/lib/api/base-url";
import { searchVehicles } from "@/services/vehicle.service";
import { filterVehicles, paginateVehicles, sortVehicles } from "@/lib/vehicle-utils";
import type { VehicleFilters, VehicleListing, VehicleSearchResult, VehicleSortOption } from "@/types/vehicle";
import type { NewCarListing } from "../types";

function asNewCars(vehicles: typeof MOCK_VEHICLES): NewCarListing[] {
  return vehicles
    .filter((v) => v.category === "new-cars" || (v.condition === "new" && v.category !== "bikes" && v.category !== "trucks"))
    .map((v) => ({ ...v, category: "new-cars" as const, condition: "new" as const }));
}

function stockRowToListing(r: Record<string, unknown>): NewCarListing {
  const dealer = (r.dealer && typeof r.dealer === "object" ? r.dealer : {}) as Record<string, unknown>;
  const priceOnRequest = Boolean(r.price_on_request) || !(Number(r.price ?? r.ex_showroom_price ?? 0) > 0);
  const price = priceOnRequest ? 0 : Number(r.price ?? r.ex_showroom_price ?? 0);
  const color = Array.isArray(r.colors) && r.colors[0] ? String(r.colors[0]) : undefined;
  const city = String(dealer.city ?? "");
  const state = String(dealer.state ?? "");
  const dealerName = dealer.name ? String(dealer.name) : "Dealer";
  const yearNum = r.year != null && Number(r.year) > 0 ? Number(r.year) : new Date().getFullYear();
  const fuel = r.fuel_type != null && String(r.fuel_type).trim() ? String(r.fuel_type).trim() : "";
  const transmission =
    r.transmission != null && String(r.transmission).trim() ? String(r.transmission).trim() : "";
  const variant = r.variant != null && String(r.variant).trim() ? String(r.variant).trim() : "";
  const imageRaw = r.image_url != null ? String(r.image_url).trim() : "";
  const fromApi = Array.isArray(r.images)
    ? (r.images as unknown[]).map((u) => String(u ?? "").trim()).filter(Boolean)
    : [];
  const images = [...fromApi, ...(imageRaw ? [imageRaw] : [])]
    .filter(
      (u, i, arr) =>
        (u.startsWith("http://") ||
          u.startsWith("https://") ||
          u.includes("/uploads/") ||
          u.startsWith("/media/")) &&
        arr.indexOf(u) === i,
    )
    .slice(0, 8);
  const titleParts = [r.brand, r.model, variant].filter((p) => p != null && String(p).trim());
  const specs =
    r.specifications && typeof r.specifications === "object" && !Array.isArray(r.specifications)
      ? (r.specifications as Record<string, string>)
      : {};
  const features = Array.isArray(r.features) ? (r.features as string[]).map(String) : [];
  const bodyType =
    (r.body_type != null && String(r.body_type).trim()) ||
    (typeof specs.bodyType === "string" ? specs.bodyType : "") ||
    "";
  return {
    id: String(r.id),
    // Full inventory UUID so detail pages can resolve (short prefix caused 404)
    slug: `ncd-${String(r.id)}`,
    title: titleParts.join(" ").trim(),
    brand: String(r.brand ?? ""),
    model: String(r.model ?? ""),
    variant,
    year: yearNum,
    price,
    originalPrice: priceOnRequest ? undefined : Number(r.ex_showroom_price ?? price),
    fuelType: fuel,
    transmission,
    bodyType,
    category: "new-cars",
    condition: "new",
    kmsDriven: 0,
    owners: 0,
    color,
    city,
    state,
    location: [city, state].filter(Boolean).join(", ") || "",
    images,
    features,
    description: r.notes != null ? String(r.notes) : undefined,
    isCertified: false,
    isFeatured: false,
    status: "available",
    saleMode: "dealer_offer",
    dealerId: dealer.id ? String(dealer.id) : undefined,
    dealerName,
    dealerSlug: dealer.slug ? String(dealer.slug) : undefined,
    dealerVerified: Boolean(dealer.is_verified),
    createdAt: new Date().toISOString(),
    metadata: {
      ncdInventoryId: String(r.id),
      vehicleId: r.vehicle_id ? String(r.vehicle_id) : undefined,
      stock: Number(r.stock ?? 0),
      stockStatus: String(r.stock_status ?? "available"),
      catalogVariantId: r.catalog_variant_id ? String(r.catalog_variant_id) : undefined,
      source: "new_car_inventory",
      pincode: dealer.pincode ? String(dealer.pincode) : undefined,
      priceOnRequest,
      priceDisplay: priceOnRequest ? "Price on request" : undefined,
      priceSourceText: r.price_source_text ? String(r.price_source_text) : undefined,
      onRoadPrice:
        !priceOnRequest && r.on_road_price != null && Number(r.on_road_price) > 0
          ? Number(r.on_road_price)
          : undefined,
      waitingPeriod: r.waiting_period_days ? String(r.waiting_period_days) : undefined,
      brochureUrl: r.brochure_url ? String(r.brochure_url) : undefined,
      specifications: specs,
    } as VehicleListing["metadata"],
  };
}

function unwrapStockRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  }
  return [];
}

function unwrapStockRow(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    return obj.data as Record<string, unknown>;
  }
  if (obj.id) return obj;
  return null;
}

/** Resolve NewCarInventory public detail by ncd-{uuid} or raw inventory id. */
export async function fetchNewCarBySlug(slug: string): Promise<VehicleListing | null> {
  const raw = String(slug ?? "").trim();
  if (!raw) return null;
  const id = raw.replace(/^ncd-/i, "");
  if (!id || !hasConfiguredApi()) return null;
  try {
    const { data } = await api.get<unknown>(`/api/new-car/stock/${encodeURIComponent(id)}`);
    const row = unwrapStockRow(data);
    if (!row) return null;
    return stockRowToListing(row) as VehicleListing;
  } catch {
    return null;
  }
}

function mergeNewCarListings(stock: VehicleListing[], fromVehicles: VehicleListing[]): VehicleListing[] {
  const linkedVehicleIds = new Set<string>();
  for (const s of stock) {
    const vid = s.metadata && typeof (s.metadata as { vehicleId?: string }).vehicleId === "string"
      ? (s.metadata as { vehicleId?: string }).vehicleId
      : undefined;
    if (vid) linkedVehicleIds.add(vid);
  }
  const stockKeys = new Set(
    stock.map((s) => `${(s.dealerId ?? "").toLowerCase()}|${s.brand.toLowerCase()}|${s.model.toLowerCase()}|${(s.variant ?? "").toLowerCase()}`),
  );

  const extras = fromVehicles.filter((v) => {
    if (linkedVehicleIds.has(v.id)) return false;
    const key = `${(v.dealerId ?? "").toLowerCase()}|${v.brand.toLowerCase()}|${v.model.toLowerCase()}|${(v.variant ?? "").toLowerCase()}`;
    if (stockKeys.has(key)) return false;
    // Only real new-car / new-condition uploads — never used leftovers without new flag
    return v.category === "new-cars" || v.condition === "new";
  });

  return [...stock, ...extras.map((v) => ({ ...v, category: "new-cars" as const, condition: "new" as const }))];
}

export async function searchNewCars(params: {
  filters?: Omit<VehicleFilters, "category"> & { pincode?: string };
  sort?: VehicleSortOption;
  page?: number;
  pageSize?: number;
}): Promise<VehicleSearchResult> {
  const { filters = {}, sort = "newest", page = 1, pageSize = 12 } = params;

  let stock: VehicleListing[] = [];
  if (hasConfiguredApi()) {
    try {
      const { data } = await api.get<unknown>("/api/new-car/stock", {
        params: {
          brand: filters.brand,
          q: filters.q,
          // Only pass real 6-digit pincode — never send city name as pincode (would zero results)
          pincode:
            filters.pincode && /^\d{6}$/.test(filters.pincode)
              ? filters.pincode
              : filters.city && /^\d{6}$/.test(filters.city)
                ? filters.city
                : undefined,
          limit: 60,
        },
      });
      stock = unwrapStockRows(data).map(stockRowToListing) as VehicleListing[];
    } catch {
      stock = [];
    }
  }

  // Excel CRM bulk upload writes `vehicles` (condition=new). Always merge so New Cars page shows uploads.
  let fromVehicles: VehicleListing[] = [];
  try {
    const veh = await searchVehicles({
      filters: { ...filters, category: "new-cars", condition: "new" },
      sort: "newest",
      page: 1,
      pageSize: 200,
    });
    fromVehicles = veh.vehicles;
  } catch {
    fromVehicles = [];
  }

  const merged = mergeNewCarListings(stock, fromVehicles);
  const filtered = filterVehicles(merged, { ...filters, category: "new-cars", condition: "new" });
  const sorted = sortVehicles(filtered, sort);
  const pageResult = paginateVehicles(sorted, page, pageSize);

  if (!pageResult.total && realDataOnly) {
    return {
      vehicles: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  if (!pageResult.total && !realDataOnly) {
    const result = await searchVehicles({
      filters: { ...filters, category: "new-cars" },
      sort,
      page,
      pageSize,
    });
    return { ...result, pageSize };
  }

  return {
    vehicles: pageResult.items,
    total: pageResult.total,
    page: pageResult.page,
    pageSize: pageResult.pageSize,
    totalPages: pageResult.totalPages,
  };
}

export function getNewCarInventory(): NewCarListing[] {
  if (realDataOnly) return [];
  return asNewCars(MOCK_VEHICLES);
}

export function getFeaturedNewCars(limit = 8): NewCarListing[] {
  if (realDataOnly) return [];
  return sortVehicles(asNewCars(MOCK_VEHICLES), "ai-score")
    .filter((v) => v.isFeatured || v.metadata.isLatestLaunch)
    .slice(0, limit) as NewCarListing[];
}

export function getNewCarsBySegment(bodyType: string, limit = 6): NewCarListing[] {
  if (realDataOnly) return [];
  return filterVehicles(asNewCars(MOCK_VEHICLES), { category: "new-cars", bodyType }).slice(0, limit) as NewCarListing[];
}

export function getNewlyLaunched(limit = 6): NewCarListing[] {
  if (realDataOnly) return [];
  const pool = asNewCars(MOCK_VEHICLES).filter((v) => v.metadata.isLatestLaunch);
  return sortVehicles(pool, "newest").slice(0, limit) as NewCarListing[];
}
