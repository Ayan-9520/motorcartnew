import { searchNewCars } from "@/features/new-cars/services/new-cars.service";
import { searchVehicles } from "@/services/vehicle.service";
import { brandsMatch, getDiscountedPrice } from "@/lib/vehicle-utils";
import { buyListingPath, hubCategoryToFilters } from "../lib/route-utils";
import { getBuyBrandsForHub } from "../data/buy-brands";
import type { HubCategorySlug, VehicleConditionSlug } from "../types";
import type { VehicleListing } from "@/types/vehicle";

export function slugifyLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buyBrandModelsPath(
  hub: HubCategorySlug,
  condition: VehicleConditionSlug,
  brand: string,
): string {
  return `${buyListingPath(hub, condition)}/brand/${slugifyLabel(brand)}`;
}

export function buyModelVariantsPath(
  hub: HubCategorySlug,
  condition: VehicleConditionSlug,
  brand: string,
  model: string,
): string {
  return `${buyBrandModelsPath(hub, condition, brand)}/model/${slugifyLabel(model)}`;
}

export function buyFilteredListingsPath(
  hub: HubCategorySlug,
  condition: VehicleConditionSlug,
  opts: { brand: string; model?: string; variant?: string },
): string {
  const params = new URLSearchParams();
  params.set("brand", opts.brand);
  if (opts.model) params.set("model", opts.model);
  if (opts.variant) params.set("variant", opts.variant);
  return `${buyListingPath(hub, condition)}?${params.toString()}`;
}

export function resolveBrandLabel(hub: HubCategorySlug, brandSlug: string): string {
  const brands = getBuyBrandsForHub(hub);
  const hit = brands.find(
    (b) =>
      b.id === brandSlug ||
      slugifyLabel(b.brand) === brandSlug ||
      slugifyLabel(b.name) === brandSlug,
  );
  if (hit) return hit.name || hit.brand;
  return brandSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Shorter OEM token for API `contains` (Maruti matches Maruti Suzuki stock). */
export function resolveBrandApiFilter(hub: HubCategorySlug, brandSlug: string): string {
  const brands = getBuyBrandsForHub(hub);
  const hit = brands.find(
    (b) =>
      b.id === brandSlug ||
      slugifyLabel(b.brand) === brandSlug ||
      slugifyLabel(b.name) === brandSlug,
  );
  if (hit?.brand) return hit.brand;
  return resolveBrandLabel(hub, brandSlug);
}

export type CatalogModelCard = {
  model: string;
  slug: string;
  count: number;
  image?: string;
  priceFrom: number | null;
  bodyType?: string;
  fuelTypes: string[];
};

export type CatalogVariantCard = {
  variant: string;
  slug: string;
  count: number;
  image?: string;
  priceFrom: number | null;
  fuelType?: string;
  transmission?: string;
  /** When only one stock row, open detail directly. */
  detailSlug?: string;
};

async function fetchBrandListings(
  hub: HubCategorySlug,
  condition: VehicleConditionSlug,
  brand: string,
  model?: string,
  brandSlug?: string,
): Promise<VehicleListing[]> {
  const base = hubCategoryToFilters(hub, condition);
  const apiBrand = brandSlug ? resolveBrandApiFilter(hub, brandSlug) : brand;
  const filters = {
    ...base,
    brand: apiBrand,
    ...(model ? { model } : {}),
  };

  if (condition === "new" && (hub === "cars" || hub === "ev")) {
    const result = await searchNewCars({
      filters: { ...filters, condition: "new" },
      sort: "newest",
      page: 1,
      pageSize: 200,
    });
    // Keep rows that match marketing label OR API token (Maruti Suzuki ↔ Maruti)
    return result.vehicles.filter((v) => brandsMatch(v.brand, brand) || brandsMatch(v.brand, apiBrand));
  }

  const result = await searchVehicles({
    filters,
    sort: "newest",
    page: 1,
    pageSize: 200,
  });
  return result.vehicles.filter((v) => brandsMatch(v.brand, brand) || brandsMatch(v.brand, apiBrand));
}

export async function loadBrandModels(
  hub: HubCategorySlug,
  condition: VehicleConditionSlug,
  brand: string,
  brandSlug?: string,
): Promise<CatalogModelCard[]> {
  const vehicles = await fetchBrandListings(hub, condition, brand, undefined, brandSlug);
  const map = new Map<string, CatalogModelCard>();

  for (const v of vehicles) {
    const model = (v.model || "").trim();
    if (!model) continue;
    const key = model.toLowerCase();
    const price = getDiscountedPrice(v);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        model,
        slug: slugifyLabel(model),
        count: 1,
        image: v.images?.[0],
        priceFrom: price > 0 ? price : null,
        bodyType: v.bodyType || undefined,
        fuelTypes: v.fuelType ? [v.fuelType] : [],
      });
    } else {
      existing.count += 1;
      if (!existing.image && v.images?.[0]) existing.image = v.images[0];
      if (price > 0 && (existing.priceFrom == null || price < existing.priceFrom)) {
        existing.priceFrom = price;
      }
      if (v.fuelType && !existing.fuelTypes.includes(v.fuelType)) {
        existing.fuelTypes.push(v.fuelType);
      }
    }
  }

  return [...map.values()].sort((a, b) => a.model.localeCompare(b.model));
}

export async function loadModelVariants(
  hub: HubCategorySlug,
  condition: VehicleConditionSlug,
  brand: string,
  model: string,
  brandSlug?: string,
): Promise<{ variants: CatalogVariantCard[]; listingsWithoutVariant: number }> {
  const vehicles = await fetchBrandListings(hub, condition, brand, model, brandSlug);
  const map = new Map<string, CatalogVariantCard>();
  let listingsWithoutVariant = 0;

  for (const v of vehicles) {
    const variant = (v.variant || "").trim();
    if (!variant) {
      listingsWithoutVariant += 1;
      continue;
    }
    const key = variant.toLowerCase();
    const price = getDiscountedPrice(v);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        variant,
        slug: slugifyLabel(variant),
        count: 1,
        image: v.images?.[0],
        priceFrom: price > 0 ? price : null,
        fuelType: v.fuelType || undefined,
        transmission: v.transmission || undefined,
        detailSlug: v.slug,
      });
    } else {
      existing.count += 1;
      existing.detailSlug = undefined;
      if (!existing.image && v.images?.[0]) existing.image = v.images[0];
      if (price > 0 && (existing.priceFrom == null || price < existing.priceFrom)) {
        existing.priceFrom = price;
      }
    }
  }

  return {
    variants: [...map.values()].sort((a, b) => a.variant.localeCompare(b.variant)),
    listingsWithoutVariant,
  };
}
