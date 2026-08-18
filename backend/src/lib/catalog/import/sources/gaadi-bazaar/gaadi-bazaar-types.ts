/** Raw GaadiBazaar scraper payload types (Phase 4B — read-only, no HTTP). */

export type GaadiBazaarScrapedVehicle = {
  segment?: string;
  vehicleTitle?: string;
  brand?: string;
  model?: string;
  variant?: string;
  fuel?: string;
  transmission?: string;
  price?: number | string;
  year?: number | string;
  city?: string;
  state?: string;
  imageUrls?: string[];
  imageUrl?: string;
  brochureUrl?: string;
  vehicleUrl?: string;
  sourceId?: string;
};

export type GaadiBazaarScraperPayload = {
  segment?: string;
  vehicles: GaadiBazaarScrapedVehicle[];
  scrapedAt?: string;
  source?: string;
};

export const GAADI_BAZAAR_PAYLOAD_KEY = "scraperPayload";
