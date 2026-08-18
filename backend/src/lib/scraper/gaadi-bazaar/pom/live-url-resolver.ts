import {
  buildGaadiBazaarLiveHomeUrl,
  buildGaadiBazaarLiveListingUrl,
  GAADI_BAZAAR_LIVE_ORIGIN,
} from "../scraper/live/gaadi-bazaar-live-urls";
import type { GaadiBazaarUrlResolver } from "./pom-types";

export function createGaadiBazaarLiveUrlResolver(): GaadiBazaarUrlResolver {
  return {
    mode: "live",
    home: () => buildGaadiBazaarLiveHomeUrl(),
    listing: (query?: string, city?: string) =>
      buildGaadiBazaarLiveListingUrl({
        city: city ?? "Delhi",
        search: query,
      }),
    vehicle: (id: string) => {
      if (id.startsWith("http")) return id;
      return `${GAADI_BAZAAR_LIVE_ORIGIN}/${id.replace(/^\//, "")}`;
    },
  };
}
