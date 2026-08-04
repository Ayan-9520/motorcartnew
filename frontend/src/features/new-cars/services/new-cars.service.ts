import { MOCK_VEHICLES } from "@/data/vehicle-catalog";
import { realDataOnly } from "@/config/real-data";
import { searchVehicles } from "@/services/vehicle.service";
import { filterVehicles, paginateVehicles, sortVehicles } from "@/lib/vehicle-utils";
import type { VehicleFilters, VehicleSearchResult, VehicleSortOption } from "@/types/vehicle";
import type { NewCarListing } from "../types";

function asNewCars(vehicles: typeof MOCK_VEHICLES): NewCarListing[] {
  return vehicles
    .filter((v) => v.category === "new-cars" || (v.condition === "new" && v.category !== "bikes" && v.category !== "trucks"))
    .map((v) => ({ ...v, category: "new-cars" as const, condition: "new" as const }));
}

export async function searchNewCars(params: {
  filters?: Omit<VehicleFilters, "category">;
  sort?: VehicleSortOption;
  page?: number;
  pageSize?: number;
}): Promise<VehicleSearchResult> {
  const { filters = {}, sort = "newest", page = 1, pageSize = 12 } = params;
  const result = await searchVehicles({
    filters: { ...filters, category: "new-cars" },
    sort,
    page,
    pageSize,
  });
  return { ...result, pageSize };
}

export function getNewCarInventory(): NewCarListing[] {
  return asNewCars(MOCK_VEHICLES);
}

export function getFeaturedNewCars(limit = 8): NewCarListing[] {
  if (realDataOnly) return [];
  return sortVehicles(asNewCars(MOCK_VEHICLES), "ai-score")
    .filter((v) => v.isFeatured || v.metadata.isLatestLaunch)
    .slice(0, limit) as NewCarListing[];
}

export function getNewCarsBySegment(bodyType: string, limit = 6): NewCarListing[] {
  return filterVehicles(asNewCars(MOCK_VEHICLES), { category: "new-cars", bodyType }).slice(0, limit) as NewCarListing[];
}

export function getNewlyLaunched(limit = 6): NewCarListing[] {
  const pool = asNewCars(MOCK_VEHICLES).filter((v) => v.metadata.isLatestLaunch);
  return sortVehicles(pool, "newest").slice(0, limit) as NewCarListing[];
}
