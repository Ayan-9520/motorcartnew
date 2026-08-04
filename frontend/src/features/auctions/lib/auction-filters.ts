import { MOCK_AUCTION_EVENTS } from "../data/auction-hub-data";
import type { AuctionAssetCategoryId } from "../data/auction-hub-data";

/** Keyword heuristics for browse ?category= filters */
export const AUCTION_CATEGORY_KEYWORDS: Record<AuctionAssetCategoryId | string, string[]> = {
  commercial: ["truck", "tata prima", "lcv", "commercial", "ace", "407"],
  cars: ["creta", "seltos", "swift", "city", "car", "suv", "hyundai", "kia", "maruti", "honda"],
  tractors: ["tractor", "farm", "mahindra", "swaraj"],
  "two-wheelers": ["bike", "activa", "pulsar", "royal enfield", "scooter"],
  buses: ["bus", "coach", "traveller", "winger"],
  construction: ["jcb", "crane", "excavator", "mixer", "equipment"],
  gold: ["gold", "pledge", "asset"],
  "real-estate": ["real estate", "plot", "commercial space", "property"],
};

export function auctionMatchesCategory(title: string, category: string): boolean {
  const keys = AUCTION_CATEGORY_KEYWORDS[category];
  if (!keys?.length) return true;
  const t = title.toLowerCase();
  return keys.some((k) => t.includes(k));
}

export function auctionMatchesMode(location: string, mode: string): boolean {
  if (!mode) return true;
  const matchingEvents = MOCK_AUCTION_EVENTS.filter((e) => e.mode === mode);
  if (matchingEvents.length === 0) return true;
  const loc = location.toLowerCase();
  return matchingEvents.some((ev) => {
    const city = ev.city.toLowerCase().split(" ")[0]!;
    return loc.includes(city) || loc.includes(ev.state.toLowerCase().split(" ")[0]!);
  });
}
