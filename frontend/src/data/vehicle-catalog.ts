/**
 * Public marketplace uses PostgreSQL only (`VITE_REAL_DATA_ONLY=true`).
 * Upload via dealer inventory, sell flow, or new-car dashboard.
 */
import type { VehicleListing } from "@/types/vehicle";

export const MOCK_VEHICLES: VehicleListing[] = [];

export const VEHICLE_BRANDS: string[] = [];
export const VEHICLE_CITIES: string[] = [];
export const VEHICLE_BODY_TYPES: string[] = [];
export const VEHICLE_COLORS: string[] = [];

export const CATALOG_STATS = {
  total: 0,
  newCars: 0,
  usedCars: 0,
  bikes: 0,
  ev: 0,
  trucks: 0,
  buses: 0,
} as const;
