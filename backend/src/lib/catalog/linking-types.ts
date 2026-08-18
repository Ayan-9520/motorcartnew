/** Internal catalog linking types (Phase 2C — dry run only). */

import type { CatalogMatchConfidence, CatalogMatchMethod } from "./types";

export type ListingSource = "vehicles" | "new_car_inventory";

export type ListingRecord = {
  id: string;
  source: ListingSource;
  brand: string;
  model: string;
  variant: string | null;
  fuel: string | null;
  transmission: string | null;
  modelYear: number;
  /** Marketplace category (vehicles only), e.g. cars, bikes, used-cars. */
  category?: string | null;
};

export type CatalogLinkStatus = "MATCHED" | "MULTIPLE_MATCHES" | "LOW_CONFIDENCE" | "NO_MATCH";

export type CatalogLinkRow = {
  listingId: string;
  source: ListingSource;
  brand: string;
  model: string;
  variant: string | null;
  matchStatus: CatalogLinkStatus;
  confidence: CatalogMatchConfidence;
  catalogVariantId: string | null;
  businessKey: string | null;
  matchMethod: CatalogMatchMethod | null;
  reason: string;
  /** Present when status is MULTIPLE_MATCHES. */
  candidateVariantIds?: string[];
};

export type CatalogLinkSummary = {
  totalListings: number;
  matched: number;
  multiple: number;
  lowConfidence: number;
  noMatch: number;
  bySource: {
    vehicles: Pick<CatalogLinkSummary, "totalListings" | "matched" | "multiple" | "lowConfidence" | "noMatch">;
    newCarInventory: Pick<CatalogLinkSummary, "totalListings" | "matched" | "multiple" | "lowConfidence" | "noMatch">;
  };
};

export type CatalogLinkReport = {
  generatedAt: string;
  dryRun: true;
  summary: CatalogLinkSummary;
  rows: CatalogLinkRow[];
};

export type CatalogLinkingConfig = {
  /** Confidence scores at or above this value (excluding fuzzy) count as MATCHED. Default: 80 */
  matchedMinConfidence: number;
  /** Confidence score for fuzzy matches. Default: 60 */
  fuzzyConfidence: 60;
};

export const DEFAULT_LINKING_CONFIG: CatalogLinkingConfig = {
  matchedMinConfidence: 80,
  fuzzyConfidence: 60,
};
