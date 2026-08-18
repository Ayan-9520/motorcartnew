/** Catalog master JSON API payload types (Phase 5G-1 infrastructure). */

export type CatalogMasterVehicleRecord = {
  brand?: string;
  model?: string;
  variant?: string;
  fuel?: string;
  transmission?: string;
  year?: number | string;
  segment?: string;
  bodyType?: string;
  color?: string;
  exShowroomPrice?: number | string;
  onRoadPrice?: number | string;
  city?: string;
  state?: string;
  imageUrl?: string;
  brochureUrl?: string;
  description?: string;
  features?: string | string[];
  externalId?: string;
  sourceId?: string;
  [key: string]: unknown;
};

export type CatalogMasterJsonApiPayload = {
  source?: string;
  fetchedAt?: string;
  segment?: string;
  vehicles?: CatalogMasterVehicleRecord[];
  data?: CatalogMasterVehicleRecord[];
  [key: string]: unknown;
};

export const CATALOG_MASTER_PAYLOAD_KEY = "catalogMasterPayload";

/** Inventory / listing fields that must never appear in catalog-master payloads. */
export const LISTING_SHAPED_FIELD_KEYS = [
  "km driven",
  "km_driven",
  "kmdriven",
  "kms driven",
  "ownership",
  "dealer price",
  "dealer_price",
  "dealerprice",
  "discount",
  "registration state",
  "registration_state",
  "registrationstate",
] as const;
