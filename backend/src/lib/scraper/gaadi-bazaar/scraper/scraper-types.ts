/** GaadiBazaar read-only scraper types (Phase 4E). */

import type { GaadiBazaarScraperPayload } from "../../../catalog/import/sources/gaadi-bazaar/gaadi-bazaar-types";

export type GaadiBazaarScrapeError = {
  code: string;
  message: string;
  vehicleUrl?: string;
  pageNumber?: number;
  retryable?: boolean;
};

export type GaadiBazaarScrapeStats = {
  listingPagesVisited: number;
  vehicleCardsSeen: number;
  vehiclesExtracted: number;
  vehiclesFailed: number;
  retries: number;
  durationMs: number;
};

export type GaadiBazaarScrapeResult = {
  payload: GaadiBazaarScraperPayload;
  errors: GaadiBazaarScrapeError[];
  stats: GaadiBazaarScrapeStats;
};

export type GaadiBazaarScrapeOptions = {
  query?: string;
  city?: string;
  maxListingPages?: number;
  maxVehicles?: number;
  segment?: string;
};
