/** GaadiBazaar live site URL helpers (Phase 5F — controlled dry-run only). */

export const GAADI_BAZAAR_LIVE_ORIGIN = "https://www.gaadibazaar.in";

export const GAADI_BAZAAR_ALLOWED_HOSTS = ["www.gaadibazaar.in", "gaadibazaar.in"] as const;

export function slugifyGaadiBazaarToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Map common city labels to GaadiBazaar URL city slugs. */
export function gaadiBazaarCitySlug(city: string): string {
  const normalized = city.trim().toLowerCase();
  if (normalized === "delhi" || normalized === "new delhi" || normalized === "ncr") {
    return "new-delhi";
  }
  return slugifyGaadiBazaarToken(city);
}

export function buildGaadiBazaarLiveListingUrl(options: {
  city: string;
  search?: string;
  page?: number;
}): string {
  const citySlug = gaadiBazaarCitySlug(options.city);
  const brandSlug = options.search ? slugifyGaadiBazaarToken(options.search) : "";
  const path = brandSlug
    ? `/used-second-hand-${brandSlug}-cars-in-${citySlug}-for-sale`
    : `/used-second-hand-cars-in-${citySlug}-for-sale`;
  const url = new URL(path, GAADI_BAZAAR_LIVE_ORIGIN);
  if (options.page && options.page > 1) {
    url.searchParams.set("page", String(options.page));
  }
  return url.toString();
}

export function buildGaadiBazaarLiveHomeUrl(): string {
  return `${GAADI_BAZAAR_LIVE_ORIGIN}/`;
}
