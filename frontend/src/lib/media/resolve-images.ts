import type { VehicleCategory } from "@/types/vehicle";
import {
  cleanImageUrls,
  getVehicleGallery,
  inferVehicleSegment,
  isListingSafeUrl,
  SEGMENT_DEFAULTS,
  type VehicleSegment,
} from "./vehicle-media-registry";
import { getPartImages, PARTS_CATEGORY_IMAGES } from "./india-media-catalog";

export function isValidImageUrl(url?: string | null): url is string {
  return isListingSafeUrl(url);
}

export type VehicleResolveInput = {
  brand: string;
  model: string;
  bodyType: string;
  category?: VehicleCategory | string;
  fuelType?: string;
  seed?: number;
};

function registryGallery(input: VehicleResolveInput): string[] {
  return getVehicleGallery({
    brand: input.brand,
    model: input.model,
    bodyType: input.bodyType,
    category: input.category,
    fuelType: input.fuelType,
    seed: input.seed ?? 0,
  });
}

/** Listing images — honor real uploaded photos first, else category-safe stock. */
export function resolveVehicleGallery(
  brand: string,
  model: string,
  bodyType: string,
  existing?: string[] | null,
  seed = 0,
  extra?: { category?: VehicleCategory | string; fuelType?: string }
): string[] {
  const uploaded = cleanImageUrls(existing ?? []);
  if (uploaded.length >= 1) return uploaded.slice(0, 6);
  return registryGallery({
    brand,
    model,
    bodyType,
    category: extra?.category,
    fuelType: extra?.fuelType,
    seed,
  });
}

export function resolveVehicleGalleryFromListing(
  listing: VehicleResolveInput & { images?: string[] | null }
): string[] {
  const uploaded = cleanImageUrls(listing.images ?? []);
  if (uploaded.length >= 1) return uploaded.slice(0, 4);
  return registryGallery({ ...listing, seed: listing.seed ?? hashListing(listing) });
}

/**
 * Detail page gallery — uploaded photos only (never invent stock brand cars).
 */
export function resolveVehicleDetailGallery(
  listing: VehicleResolveInput & { images?: string[] | null }
): string[] {
  return cleanImageUrls(listing.images ?? []).slice(0, 8);
}

export function resolveVehicleHero(
  brand: string,
  model: string,
  bodyType: string,
  existing?: string[] | null,
  seed = 0,
  extra?: { category?: VehicleCategory | string; fuelType?: string }
): string {
  const uploaded = cleanImageUrls(existing ?? []);
  if (uploaded[0]) return uploaded[0];
  // Empty — callers should treat as no image (do not invent Pexels)
  return "";
}

function hashListing(l: VehicleResolveInput): number {
  let h = 0;
  const s = `${l.brand}|${l.model}|${l.bodyType}`;
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function resolvePartGallery(
  categorySlug: string,
  slug: string,
  existing?: string[] | null,
  seed = 0
): string[] {
  const clean = (existing ?? []).filter(
    (u) => typeof u === "string" && u.length > 16 && !u.includes("wikimedia")
  );
  if (clean.length > 0) return clean.slice(0, 3);
  return getPartImages(categorySlug, slug, seed);
}

export function resolvePartHero(
  categorySlug: string,
  slug: string,
  existing?: string[] | null,
  seed = 0
): string {
  return resolvePartGallery(categorySlug, slug, existing, seed)[0] ?? PARTS_CATEGORY_IMAGES.accessories![0]!;
}

export function resolveAuctionImages(
  title: string,
  existing?: string[] | null,
  seed = 0
): string[] {
  const clean = cleanImageUrls(existing ?? []);
  if (clean.length > 0) return clean;
  const lower = title.toLowerCase();
  if (lower.includes("bus") || lower.includes("traveller") || lower.includes("coach"))
    return getVehicleGallery({ brand: "Tata", model: "Winger", bodyType: "Bus", category: "buses", seed });
  if (lower.includes("truck") || lower.includes("407") || lower.includes("ace") || lower.includes("lcv"))
    return getVehicleGallery({ brand: "Tata", model: "407", bodyType: "Truck", category: "trucks", seed });
  if (lower.includes("activa") || lower.includes("scooter") || lower.includes("bike") || lower.includes("pulsar"))
    return getVehicleGallery({ brand: "Honda", model: "Activa", bodyType: "Scooter", category: "bikes", seed });
  if (lower.includes("ev") || lower.includes("electric") || lower.includes("nexon"))
    return getVehicleGallery({ brand: "Tata", model: "Nexon EV", bodyType: "SUV", category: "ev", fuelType: "Electric", seed });
  if (lower.includes("auto") || lower.includes("rickshaw") || lower.includes("ape"))
    return getVehicleGallery({ brand: "Bajaj", model: "RE", bodyType: "Auto", category: "auto", seed });
  return getVehicleGallery({ brand: "Hyundai", model: "Creta", bodyType: "SUV", category: "used-cars", seed });
}

export { inferVehicleSegment, SEGMENT_DEFAULTS, type VehicleSegment };
