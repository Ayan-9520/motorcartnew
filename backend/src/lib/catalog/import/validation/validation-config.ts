import type { CatalogValidationConfig } from "./validation-types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Static geo reference (no Prisma / DB). Mirrors Phase 1 seed cities. */
const GEO_CITIES = [
  { name: "Mumbai", state: "Maharashtra" },
  { name: "Delhi NCR", state: "Delhi" },
  { name: "Delhi", state: "Delhi" },
  { name: "Bangalore", state: "Karnataka" },
  { name: "Bengaluru", state: "Karnataka" },
  { name: "Hyderabad", state: "Telangana" },
  { name: "Chennai", state: "Tamil Nadu" },
  { name: "Pune", state: "Maharashtra" },
  { name: "Ahmedabad", state: "Gujarat" },
  { name: "Kolkata", state: "West Bengal" },
  { name: "Jaipur", state: "Rajasthan" },
  { name: "Lucknow", state: "Uttar Pradesh" },
] as const;

const GEO_STATES = [
  "Maharashtra",
  "Delhi",
  "Karnataka",
  "Telangana",
  "Tamil Nadu",
  "Gujarat",
  "West Bengal",
  "Rajasthan",
  "Uttar Pradesh",
] as const;

/** Known OEM brand slugs for import validation (config-only). */
export const DEFAULT_KNOWN_BRAND_SLUGS = [
  "maruti",
  "hyundai",
  "tata",
  "mahindra",
  "toyota",
  "honda",
  "kia",
  "mg",
  "skoda",
  "volkswagen",
  "renault",
  "nissan",
  "jeep",
  "citroen",
  "mercedes-benz",
  "bmw",
  "audi",
  "land-rover",
  "jaguar",
  "volvo",
  "lexus",
  "porsche",
  "ferrari",
  "lamborghini",
  "bentley",
  "rolls-royce",
  "force",
  "isuzu",
  "byd",
  "tesla",
] as const;

/** Allowed fuel slugs (normalized, post-parser). */
export const DEFAULT_ALLOWED_FUEL_SLUGS = [
  "petrol",
  "diesel",
  "cng",
  "lpg",
  "electric",
  "hybrid",
  "petrol+cng",
] as const;

/** Allowed transmission slugs (normalized, post-parser). */
export const DEFAULT_ALLOWED_TRANSMISSION_SLUGS = [
  "mt",
  "manual",
  "at",
  "automatic",
  "amt",
  "cvt",
  "dct",
] as const;

function buildGeoSets() {
  const knownCitySlugs = new Set<string>();
  const knownCityNames = new Set<string>();
  const knownStateSlugs = new Set<string>();
  const knownStateNames = new Set<string>();

  for (const city of GEO_CITIES) {
    knownCitySlugs.add(slugify(city.name));
    knownCityNames.add(city.name.toLowerCase());
    knownStateSlugs.add(slugify(city.state));
    knownStateNames.add(city.state.toLowerCase());
  }

  for (const state of GEO_STATES) {
    knownStateSlugs.add(slugify(state));
    knownStateNames.add(state.toLowerCase());
  }

  return { knownCitySlugs, knownCityNames, knownStateSlugs, knownStateNames };
}

const geo = buildGeoSets();

export const DEFAULT_VALIDATION_CONFIG: CatalogValidationConfig = {
  knownBrandSlugs: new Set(DEFAULT_KNOWN_BRAND_SLUGS),
  knownCitySlugs: geo.knownCitySlugs,
  knownCityNames: geo.knownCityNames,
  knownStateSlugs: geo.knownStateSlugs,
  knownStateNames: geo.knownStateNames,
  allowedFuelSlugs: new Set(DEFAULT_ALLOWED_FUEL_SLUGS),
  allowedTransmissionSlugs: new Set(DEFAULT_ALLOWED_TRANSMISSION_SLUGS),
  minYear: 1990,
  maxYear: new Date().getFullYear() + 2,
  warnUnknownBrand: false,
  warnUnknownGeo: true,
};

export function mergeValidationConfig(partial?: Partial<CatalogValidationConfig>): CatalogValidationConfig {
  return { ...DEFAULT_VALIDATION_CONFIG, ...partial };
}

export function slugifyGeoToken(value: string): string {
  return slugify(value);
}
