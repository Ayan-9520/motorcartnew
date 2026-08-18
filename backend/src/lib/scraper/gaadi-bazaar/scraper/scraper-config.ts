import type { RetryPolicyConfig } from "../../../playwright-worker/worker-types";
import type { GaadiBazaarUrlMode } from "../pom/pom-types";

export type GaadiBazaarScraperConfig = {
  maxListingPages: number;
  maxVehicles: number;
  retry: RetryPolicyConfig;
  listingUrlTemplate: string;
  stopWhenListingEmpty: boolean;
  urlMode: GaadiBazaarUrlMode;
};

export const DEFAULT_GAADI_BAZAAR_SCRAPER_CONFIG: GaadiBazaarScraperConfig = {
  maxListingPages: 10,
  maxVehicles: 500,
  retry: {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 1_000,
    backoffMultiplier: 2,
    retryableCodes: ["SCRAPE_NAV_FAILED", "SCRAPE_EXTRACT_FAILED", "TIMEOUT"],
  },
  listingUrlTemplate: "mock://gaadi-bazaar/listing",
  stopWhenListingEmpty: true,
  urlMode: "mock",
};

export function mergeScraperConfig(partial?: Partial<GaadiBazaarScraperConfig>): GaadiBazaarScraperConfig {
  if (!partial) return { ...DEFAULT_GAADI_BAZAAR_SCRAPER_CONFIG };
  return {
    ...DEFAULT_GAADI_BAZAAR_SCRAPER_CONFIG,
    ...partial,
    retry: { ...DEFAULT_GAADI_BAZAAR_SCRAPER_CONFIG.retry, ...partial.retry },
  };
}
