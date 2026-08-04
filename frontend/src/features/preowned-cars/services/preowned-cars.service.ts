import { MOCK_VEHICLES } from "@/data/vehicle-catalog";
import { realDataOnly } from "@/config/real-data";
import { searchVehicles } from "@/services/vehicle.service";
import { deriveFairPriceLabel, filterVehicles, paginateVehicles, sortVehicles } from "@/lib/vehicle-utils";
import type { FairPriceLabel, VehicleFilters, VehicleSearchResult, VehicleSortOption } from "@/types/vehicle";
import type { PreownedCarFilters, PreownedCarListing } from "../types";

function enrichPreowned(v: (typeof MOCK_VEHICLES)[0]): PreownedCarListing {
  const listing = { ...v, category: "used-cars" as const, condition: "used" as const };
  if (!listing.metadata.fairPriceLabel) {
    listing.metadata = {
      ...listing.metadata,
      fairPriceLabel: deriveFairPriceLabel(listing),
    };
  }
  if (listing.isCertified && !listing.metadata.trustBadges?.length) {
    listing.metadata.trustBadges = ["certified", "inspected", "warranty"];
    listing.metadata.warrantyIncluded = true;
    listing.metadata.inspectionScore = listing.metadata.inspectionScore ?? 88 + (listing.aiPriceScore ?? 0) % 10;
  }
  return listing as PreownedCarListing;
}

function asPreowned(vehicles: typeof MOCK_VEHICLES): PreownedCarListing[] {
  return vehicles
    .filter((v) => v.category === "used-cars" || (v.condition === "used" && !["bikes", "trucks", "buses", "ev"].includes(v.category)))
    .map(enrichPreowned);
}

export function applyPreownedFilters(
  vehicles: PreownedCarListing[],
  extra: PreownedCarFilters
): PreownedCarListing[] {
  let result = [...vehicles];
  if (extra.certifiedOnly) result = result.filter((v) => v.isCertified);
  if (extra.warrantyIncluded) result = result.filter((v) => v.metadata.warrantyIncluded);
  if (extra.fairPrice) {
    result = result.filter((v) => (v.metadata.fairPriceLabel ?? deriveFairPriceLabel(v)) === extra.fairPrice);
  }
  return result;
}

export async function searchPreownedCars(params: {
  filters?: Omit<VehicleFilters, "category">;
  preowned?: PreownedCarFilters;
  sort?: VehicleSortOption;
  page?: number;
  pageSize?: number;
}): Promise<VehicleSearchResult> {
  const { filters = {}, preowned = {}, sort = "newest", page = 1, pageSize = 12 } = params;
  const base = await searchVehicles({
    filters: { ...filters, category: "used-cars" },
    sort,
    page: 1,
    pageSize: 500,
  });
  const filtered = applyPreownedFilters(base.vehicles as PreownedCarListing[], preowned);
  const sorted = sortVehicles(filtered, sort);
  const { items, total, totalPages, page: safePage } = paginateVehicles(sorted, page, pageSize);
  return {
    vehicles: items as PreownedCarListing[],
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function getFeaturedPreowned(limit = 8): PreownedCarListing[] {
  if (realDataOnly) return [];
  return sortVehicles(asPreowned(MOCK_VEHICLES).filter((v) => v.isCertified), "ai-score").slice(0, limit) as PreownedCarListing[];
}

export function getPreownedByProgram(programId: string, limit = 6): PreownedCarListing[] {
  const name = programId.replace(/-/g, " ");
  return asPreowned(MOCK_VEHICLES)
    .filter((v) => v.metadata.certificationProgram?.toLowerCase().includes(name.split(" ")[0]!) || v.isCertified)
    .slice(0, limit);
}
