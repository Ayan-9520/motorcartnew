/** Unified vehicle detail DTO. Does not merge marketplace / inventory / catalog tables. */

export const VEHICLE_SOURCE_TYPES = ["marketplace", "dealer_inventory", "catalog"] as const;
export type VehicleSourceType = (typeof VEHICLE_SOURCE_TYPES)[number];

export type VehicleDetailDealer = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  phone: string | null;
  is_verified: boolean | null;
};

export type VehicleDetail = {
  id: string;
  source_type: VehicleSourceType;
  brand: string | null;
  model: string | null;
  variant: string | null;
  year: number | null;
  fuel: string | null;
  transmission: string | null;
  price: number | null;
  location: string | null;
  dealer: VehicleDetailDealer | null;
  media: string[];
  availability: string | null;
  purchasable: boolean;
  enquiry_allowed: boolean;
  slug: string | null;
  title: string | null;
  body_type: string | null;
  category: string | null;
  city: string | null;
  state: string | null;
  catalog_variant_id: string | null;
};
