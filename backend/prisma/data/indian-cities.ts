/** Major Indian cities for catalog city pricing (Phase 1 seed). */
export type CatalogCitySeed = {
  name: string;
  slug: string;
  state: string;
  stateSlug: string;
  tier: number;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const INDIAN_CATALOG_CITIES: CatalogCitySeed[] = [
  { name: "Mumbai", state: "Maharashtra", slug: "mumbai", stateSlug: "maharashtra", tier: 1 },
  { name: "Delhi NCR", state: "Delhi", slug: "delhi-ncr", stateSlug: "delhi", tier: 1 },
  { name: "Bangalore", state: "Karnataka", slug: "bangalore", stateSlug: "karnataka", tier: 1 },
  { name: "Hyderabad", state: "Telangana", slug: "hyderabad", stateSlug: "telangana", tier: 1 },
  { name: "Chennai", state: "Tamil Nadu", slug: "chennai", stateSlug: "tamil-nadu", tier: 1 },
  { name: "Pune", state: "Maharashtra", slug: "pune", stateSlug: "maharashtra", tier: 2 },
  { name: "Ahmedabad", state: "Gujarat", slug: "ahmedabad", stateSlug: "gujarat", tier: 2 },
  { name: "Kolkata", state: "West Bengal", slug: "kolkata", stateSlug: "west-bengal", tier: 2 },
  { name: "Jaipur", state: "Rajasthan", slug: "jaipur", stateSlug: "rajasthan", tier: 2 },
  { name: "Lucknow", state: "Uttar Pradesh", slug: "lucknow", stateSlug: "uttar-pradesh", tier: 2 },
];

export function citySlug(name: string): string {
  return slugify(name);
}

export function stateSlug(state: string): string {
  return slugify(state);
}
