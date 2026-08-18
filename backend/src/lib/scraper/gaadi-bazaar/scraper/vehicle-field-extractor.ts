import type { GaadiBazaarScrapedVehicle } from "../../../catalog/import/sources/gaadi-bazaar/gaadi-bazaar-types";
import type { VehicleCardSummary } from "../pom/pom-types";
import type { GaadiBazaarVehiclePage } from "../pom/pages/gaadi-bazaar-vehicle-page";

function trim(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const t = value.trim();
  return t || undefined;
}

function parsePrice(raw: string | null | undefined): string | number | undefined {
  const text = trim(raw);
  if (!text) return undefined;
  const digits = text.replace(/[,₹$\s]/g, "");
  if (/^\d+$/.test(digits)) return digits;
  return text;
}

function parseLocation(raw: string | null | undefined): { city?: string; state?: string } {
  const text = trim(raw);
  if (!text) return {};
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { city: parts[0], state: parts[1] };
  const city = parts[0];
  // Common India city labels that omit state on GaadiBazaar listing cards
  if (city && /^(new\s+)?delhi$/i.test(city)) return { city, state: "Delhi" };
  return { city };
}

function specValue(page: GaadiBazaarVehiclePage, label: string): string | undefined {
  const match = page.getSpecifications().find((s) => s.label.toLowerCase() === label.toLowerCase());
  return trim(match?.value);
}

function sourceIdFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const match = url.match(/\/([^/]+)$/);
  return match?.[1];
}

function yearFromTitle(title: string | undefined): number | undefined {
  if (!title) return undefined;
  const match = title.match(/\b((?:19|20)\d{2})\b/);
  if (!match) return undefined;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : undefined;
}

/** Maps POM vehicle detail reads to GaadiBazaarScraperPayload vehicle shape. */
export function extractVehicleFromDetailPage(
  page: GaadiBazaarVehiclePage,
  card?: VehicleCardSummary,
): GaadiBazaarScrapedVehicle {
  const title = trim(page.getTitle()) ?? trim(card?.title);
  const brand = trim(page.getBrand());
  const model = trim(page.getModel());
  const variant = trim(page.getVariant());
  const fuel = specValue(page, "Fuel") ?? trim(card?.fuelText);
  const transmission = specValue(page, "Transmission") ?? trim(card?.transmissionText);
  const price = parsePrice(page.getPrice() ?? card?.priceText);
  const location = parseLocation(page.getLocation() ?? card?.locationText);
  const images = page.getImages();
  const vehicleUrl = trim(page.getVehicleUrl()) ?? trim(card?.href);
  const brochureUrl = trim(page.getBrochureUrl());
  const imageFromCard = trim(card?.imageUrl);
  const year = yearFromTitle(title) ?? yearFromTitle(card?.title);

  return {
    vehicleTitle: title,
    brand,
    model,
    variant,
    fuel,
    transmission,
    price,
    year,
    city: location.city,
    state: location.state,
    imageUrls: images.length > 1 ? images : undefined,
    imageUrl: images.length >= 1 ? images[0] : imageFromCard,
    brochureUrl,
    vehicleUrl,
    sourceId: sourceIdFromUrl(vehicleUrl),
  };
}

export function isExtractedVehicleComplete(vehicle: GaadiBazaarScrapedVehicle): boolean {
  return Boolean(vehicle.vehicleTitle || (vehicle.brand && vehicle.model));
}
