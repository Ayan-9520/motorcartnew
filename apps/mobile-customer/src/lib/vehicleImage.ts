import { API_BASE_URL } from "../config";

/**
 * Resolve a vehicle image path to an absolute URL for Image source.
 * Relative paths are prefixed with API_BASE_URL (or window.origin on web).
 */
export function resolveVehicleImage(uri?: string | null): string | null {
  if (!uri) return null;
  const trimmed = String(uri).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) return trimmed;
  const base =
    API_BASE_URL ||
    (typeof window !== "undefined" && window.location?.origin ? window.location.origin : "");
  if (!base) return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

export function resolveVehicleImages(images?: string[] | null): string[] {
  if (!images?.length) return [];
  return images.map((img) => resolveVehicleImage(img)).filter((u): u is string => Boolean(u));
}
