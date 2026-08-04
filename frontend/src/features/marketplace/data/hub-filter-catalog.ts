import type { HubCategorySlug } from "../types";
import { MOCK_VEHICLES } from "@/data/vehicle-catalog";
import { realDataOnly } from "@/config/real-data";
import { inferVehicleSegment } from "@/lib/media/vehicle-media-registry";
import type { VehicleListing } from "@/types/vehicle";

/** Default OEM brands per hub (CarDekho-style filter sidebar) */
export const HUB_BRAND_LISTS: Record<HubCategorySlug, string[]> = {
  cars: ["Hyundai", "Tata", "Mahindra", "Maruti", "Kia", "Honda", "Toyota", "MG", "Volkswagen", "Skoda"],
  bikes: ["Honda", "Bajaj", "TVS", "Hero", "Yamaha", "Royal Enfield", "KTM", "Suzuki"],
  trucks: ["Tata", "Ashok Leyland", "Mahindra", "Eicher", "BharatBenz", "Volvo"],
  buses: ["Ashok Leyland", "Tata", "Mahindra", "Eicher", "Volvo"],
  ev: ["Tata", "Hyundai", "MG", "Mahindra", "Ola", "Ather", "Kia"],
  auto: ["Bajaj", "Piaggio", "Mahindra", "TVS"],
  equipment: ["JCB", "Mahindra", "Tata", "Caterpillar"],
};

export type BudgetPreset = { label: string; priceMin?: number; priceMax?: number };

export type EmiPreset = { label: string; emiMax: number };

/** Budget chips — CarDekho-style quick filters */
export const HUB_BUDGET_PRESETS: Record<HubCategorySlug, BudgetPreset[]> = {
  cars: [
    { label: "Under ₹5L", priceMax: 500000 },
    { label: "₹5–10L", priceMin: 500000, priceMax: 1000000 },
    { label: "₹10–20L", priceMin: 1000000, priceMax: 2000000 },
    { label: "₹20L+", priceMin: 2000000 },
  ],
  bikes: [
    { label: "Under ₹1L", priceMax: 100000 },
    { label: "₹1–2L", priceMin: 100000, priceMax: 200000 },
    { label: "₹2L+", priceMin: 200000 },
  ],
  trucks: [
    { label: "Under ₹15L", priceMax: 1500000 },
    { label: "₹15–25L", priceMin: 1500000, priceMax: 2500000 },
    { label: "₹25L+", priceMin: 2500000 },
  ],
  buses: [
    { label: "Under ₹20L", priceMax: 2000000 },
    { label: "₹20–35L", priceMin: 2000000, priceMax: 3500000 },
    { label: "₹35L+", priceMin: 3500000 },
  ],
  ev: [
    { label: "Under ₹12L", priceMax: 1200000 },
    { label: "₹12–20L", priceMin: 1200000, priceMax: 2000000 },
    { label: "₹20L+", priceMin: 2000000 },
  ],
  auto: [
    { label: "Under ₹3L", priceMax: 300000 },
    { label: "₹3–5L", priceMin: 300000, priceMax: 500000 },
    { label: "₹5L+", priceMin: 500000 },
  ],
  equipment: [
    { label: "Under ₹10L", priceMax: 1000000 },
    { label: "₹10–25L", priceMin: 1000000, priceMax: 2500000 },
    { label: "₹25L+", priceMin: 2500000 },
  ],
};

export const HUB_EMI_PRESETS: Record<HubCategorySlug, EmiPreset[]> = {
  cars: [
    { label: "EMI under ₹10k", emiMax: 10000 },
    { label: "EMI under ₹15k", emiMax: 15000 },
    { label: "EMI under ₹25k", emiMax: 25000 },
  ],
  bikes: [
    { label: "EMI under ₹3k", emiMax: 3000 },
    { label: "EMI under ₹5k", emiMax: 5000 },
  ],
  trucks: [
    { label: "EMI under ₹20k", emiMax: 20000 },
    { label: "EMI under ₹35k", emiMax: 35000 },
  ],
  buses: [
    { label: "EMI under ₹40k", emiMax: 40000 },
    { label: "EMI under ₹60k", emiMax: 60000 },
  ],
  ev: [
    { label: "EMI under ₹12k", emiMax: 12000 },
    { label: "EMI under ₹20k", emiMax: 20000 },
  ],
  auto: [
    { label: "EMI under ₹5k", emiMax: 5000 },
    { label: "EMI under ₹8k", emiMax: 8000 },
  ],
  equipment: [
    { label: "EMI under ₹15k", emiMax: 15000 },
    { label: "EMI under ₹30k", emiMax: 30000 },
  ],
};

function listingMatchesHub(v: VehicleListing, hub: HubCategorySlug): boolean {
  const seg = inferVehicleSegment({
    brand: v.brand,
    model: v.model,
    bodyType: v.bodyType,
    category: v.category,
    fuelType: v.fuelType,
  });
  if (hub === "cars") return seg === "cars";
  if (hub === "bikes") return seg === "bikes";
  if (hub === "trucks") return seg === "trucks";
  if (hub === "buses") return seg === "buses";
  if (hub === "ev") return seg === "ev";
  if (hub === "auto") return seg === "auto";
  if (hub === "equipment") return seg === "equipment";
  return true;
}

export function getHubBrands(hub: HubCategorySlug): string[] {
  const brands = new Set<string>(HUB_BRAND_LISTS[hub]);
  if (!realDataOnly) {
    for (const v of MOCK_VEHICLES) {
      if (listingMatchesHub(v, hub)) brands.add(v.brand);
    }
  }
  return [...brands].sort();
}

export function getHubBodyTypes(hub: HubCategorySlug): string[] {
  if (realDataOnly) return [];
  const types = new Set<string>();
  for (const v of MOCK_VEHICLES) {
    if (listingMatchesHub(v, hub)) types.add(v.bodyType);
  }
  return [...types].sort();
}

export function getHubFuels(hub: HubCategorySlug): string[] {
  if (realDataOnly) return [];
  const fuels = new Set<string>();
  for (const v of MOCK_VEHICLES) {
    if (listingMatchesHub(v, hub)) fuels.add(v.fuelType);
  }
  return [...fuels].sort();
}
