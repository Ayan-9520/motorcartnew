/** GaadiBazaar POM shared types (Phase 4D — no scraping persistence). */

export type VehicleCardSummary = {
  index: number;
  title: string;
  href: string;
  priceText: string | null;
  locationText: string | null;
  imageUrl: string | null;
  fuelText?: string | null;
  transmissionText?: string | null;
};

export type VehicleSpecification = {
  label: string;
  value: string;
};

export type VehicleDetailView = {
  title: string;
  priceText: string | null;
  locationText: string | null;
  images: string[];
  specifications: VehicleSpecification[];
  sourceUrl: string | null;
};

export type GaadiBazaarPageKind = "home" | "listing" | "vehicle";

export const GAADI_BAZAAR_MOCK_URLS = {
  home: "mock://gaadi-bazaar/home",
  listing: "mock://gaadi-bazaar/listing",
  vehicle: (id: string) => `mock://gaadi-bazaar/vehicle/${id}`,
} as const;

export type GaadiBazaarUrlMode = "mock" | "live";

export type GaadiBazaarUrlResolver = {
  mode: GaadiBazaarUrlMode;
  home: () => string;
  listing: (query?: string, city?: string) => string;
  vehicle: (id: string) => string;
};

export const GAADI_BAZAAR_MOCK_URL_RESOLVER: GaadiBazaarUrlResolver = {
  mode: "mock",
  home: () => GAADI_BAZAAR_MOCK_URLS.home,
  listing: (query?: string) =>
    query ? `${GAADI_BAZAAR_MOCK_URLS.listing}?q=${encodeURIComponent(query)}` : GAADI_BAZAAR_MOCK_URLS.listing,
  vehicle: (id: string) => GAADI_BAZAAR_MOCK_URLS.vehicle(id),
};
