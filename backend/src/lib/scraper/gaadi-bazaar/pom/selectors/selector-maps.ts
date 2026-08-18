/** Centralized selector maps with versioning (Phase 4D). */

export const SUPPORTED_SELECTOR_VERSIONS = ["v1"] as const;

export type SelectorVersion = (typeof SUPPORTED_SELECTOR_VERSIONS)[number];

export const DEFAULT_SELECTOR_VERSION: SelectorVersion = "v1";

export type HomePageSelectors = {
  searchInput: string;
  searchButton: string;
  citySelect: string;
  cityOptionTemplate: string;
  heroBanner: string;
};

export type ListingPageSelectors = {
  resultsContainer: string;
  vehicleCard: string;
  vehicleCardTitle: string;
  vehicleCardLink: string;
  vehicleCardPrice: string;
  vehicleCardLocation: string;
  vehicleCardImage: string;
  nextPageButton: string;
  paginationCurrent: string;
  emptyState: string;
};

export type VehiclePageSelectors = {
  title: string;
  price: string;
  location: string;
  imageGallery: string;
  imageItem: string;
  specificationsTable: string;
  specificationRow: string;
  specificationLabel: string;
  specificationValue: string;
  breadcrumb: string;
  brochureLink: string;
};

export type GaadiBazaarSelectorMap = {
  version: SelectorVersion;
  home: HomePageSelectors;
  listing: ListingPageSelectors;
  vehicle: VehiclePageSelectors;
};

export const GAADI_BAZAAR_SELECTORS_V1: GaadiBazaarSelectorMap = {
  version: "v1",
  home: {
    searchInput: '[data-gb="home-search-input"]',
    searchButton: '[data-gb="home-search-button"]',
    citySelect: '[data-gb="home-city-select"]',
    cityOptionTemplate: '[data-gb-city="{city}"]',
    heroBanner: '[data-gb="home-hero-banner"]',
  },
  listing: {
    resultsContainer: '[data-gb="listing-results"]',
    vehicleCard: '[data-gb="listing-vehicle-card"]',
    vehicleCardTitle: '[data-gb="listing-vehicle-title"]',
    vehicleCardLink: '[data-gb="listing-vehicle-link"]',
    vehicleCardPrice: '[data-gb="listing-vehicle-price"]',
    vehicleCardLocation: '[data-gb="listing-vehicle-location"]',
    vehicleCardImage: '[data-gb="listing-vehicle-image"]',
    nextPageButton: '[data-gb="listing-next-page"]',
    paginationCurrent: '[data-gb="listing-pagination-current"]',
    emptyState: '[data-gb="listing-empty"]',
  },
  vehicle: {
    title: '[data-gb="vehicle-title"]',
    price: '[data-gb="vehicle-price"]',
    location: '[data-gb="vehicle-location"]',
    imageGallery: '[data-gb="vehicle-image-gallery"]',
    imageItem: '[data-gb="vehicle-image-item"]',
    specificationsTable: '[data-gb="vehicle-specifications"]',
    specificationRow: '[data-gb="vehicle-spec-row"]',
    specificationLabel: '[data-gb="vehicle-spec-label"]',
    specificationValue: '[data-gb="vehicle-spec-value"]',
    breadcrumb: '[data-gb="vehicle-breadcrumb"]',
    brochureLink: '[data-gb="vehicle-brochure-link"]',
  },
};

export const GAADI_BAZAAR_SELECTOR_MAPS: Record<SelectorVersion, GaadiBazaarSelectorMap> = {
  v1: GAADI_BAZAAR_SELECTORS_V1,
};

export function resolveSelectorTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => variables[key] ?? "");
}

export function isSelectorVersion(value: string): value is SelectorVersion {
  return (SUPPORTED_SELECTOR_VERSIONS as readonly string[]).includes(value);
}
