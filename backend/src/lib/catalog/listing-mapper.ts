import { inferSegmentFromCategory } from "./segment-inference";
import type { CatalogMatchInput } from "./types";
import type { ListingRecord } from "./linking-types";

export function listingToMatchInput(listing: ListingRecord): CatalogMatchInput | null {
  const brand = listing.brand?.trim();
  const model = listing.model?.trim();
  const variant = listing.variant?.trim();

  if (!brand || !model) return null;

  const segment = inferSegmentFromCategory(listing.category);

  return {
    segment,
    brand,
    model,
    variant: variant || model,
    fuel: listing.fuel?.trim() || "unknown",
    transmission: listing.transmission?.trim() || "unknown",
    modelYear: listing.modelYear,
  };
}

export function vehicleRowToListing(row: {
  id: string;
  brand: string;
  model: string;
  variant: string | null;
  fuelType: string;
  transmission: string;
  year: number;
  category: string;
}): ListingRecord {
  return {
    id: row.id,
    source: "vehicles",
    brand: row.brand,
    model: row.model,
    variant: row.variant,
    fuel: row.fuelType,
    transmission: row.transmission,
    modelYear: row.year,
    category: row.category,
  };
}

export function newCarInventoryRowToListing(row: {
  id: string;
  brand: string;
  model: string;
  variant: string | null;
  fuelType: string | null;
  transmission: string | null;
  year: number;
}): ListingRecord {
  return {
    id: row.id,
    source: "new_car_inventory",
    brand: row.brand,
    model: row.model,
    variant: row.variant,
    fuel: row.fuelType,
    transmission: row.transmission,
    modelYear: row.year,
    category: "new-cars",
  };
}
