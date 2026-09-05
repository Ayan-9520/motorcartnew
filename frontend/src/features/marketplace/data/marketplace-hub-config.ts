import type { HubCategorySlug } from "../types";

export interface HubMarketplaceCopy {
  singular: string;
  plural: string;
  dreamLabel: string;
  searchPlaceholder: string;
  sellTitle: string;
  sellSubtitle: string;
  /** Hero lead under sell headline */
  sellHeroLead: string;
}

export const HUB_MARKETPLACE_COPY: Record<HubCategorySlug, HubMarketplaceCopy> = {
  cars: {
    singular: "car",
    plural: "Cars",
    dreamLabel: "Dream Car",
    searchPlaceholder: "Search cars or brands — e.g. Creta, Swift, Mumbai",
    sellTitle: "Sell your pre-owned car",
    sellSubtitle: "List your car and request dealer purchase offers",
    sellHeroLead: "Free listing in minutes. Verified dealers send real purchase offers.",
  },
  bikes: {
    singular: "bike",
    plural: "Bikes",
    dreamLabel: "Dream Bike",
    searchPlaceholder: "Search bikes or brands — e.g. Activa, Classic 350",
    sellTitle: "Sell your pre-owned bike",
    sellSubtitle: "List in minutes — dealer offers when submitted",
    sellHeroLead: "Quick list for two-wheelers. Local buyers & dealer offers.",
  },
  trucks: {
    singular: "truck",
    plural: "Trucks",
    dreamLabel: "Dream Truck",
    searchPlaceholder: "Search trucks — Tata 407, Ashok Leyland, tonnage",
    sellTitle: "Sell your commercial truck",
    sellSubtitle: "Fleet buyers & pan-India logistics partners",
    sellHeroLead: "Reach fleet & logistics buyers across India.",
  },
  buses: {
    singular: "bus",
    plural: "Buses",
    searchPlaceholder: "Search buses — seats, route, Volvo, Tata",
    dreamLabel: "Dream Bus",
    sellTitle: "Sell your bus or coach",
    sellSubtitle: "School, staff & tourist coach buyers",
    sellHeroLead: "School, staff & tourist coach buyers ready to bid.",
  },
  auto: {
    singular: "auto",
    plural: "Autos",
    dreamLabel: "Dream Auto",
    searchPlaceholder: "Search autos — Bajaj RE, Piaggio Ape, cargo",
    sellTitle: "Sell your auto rickshaw",
    sellSubtitle: "High local demand · Passenger & cargo listings",
    sellHeroLead: "High local demand for passenger & cargo three-wheelers.",
  },
  equipment: {
    singular: "equipment",
    plural: "Equipment",
    dreamLabel: "Dream Equipment",
    searchPlaceholder: "Search tractors, excavators & industrial",
    sellTitle: "Sell your equipment",
    sellSubtitle: "B2B buyers across India",
    sellHeroLead: "Tractors, excavators & industrial — B2B buyers pan-India.",
  },
  ev: {
    singular: "EV",
    plural: "Electric",
    dreamLabel: "Dream EV",
    searchPlaceholder: "Search electric cars & two-wheelers",
    sellTitle: "Sell your electric vehicle",
    sellSubtitle: "Battery health report · EV-specialist buyers",
    sellHeroLead: "EV-ready buyers. Highlight battery health & range.",
  },
};

export function getHubCopy(hub: HubCategorySlug): HubMarketplaceCopy {
  return HUB_MARKETPLACE_COPY[hub];
}
