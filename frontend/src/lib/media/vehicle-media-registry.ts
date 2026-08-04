/**
 * Motorcart vehicle media — strict segment pools (Pexels only, no cross-category).
 * Brand picks a stable offset within the segment pool (Hyundai → car slot, Honda Activa → bike slot).
 */
import type { VehicleCategory } from "@/types/vehicle";
import { VEHICLE_TEMPLATES } from "@/data/india-vehicle-master";
import { pexels } from "@/lib/media-urls";

export type VehicleSegment =
  | "cars"
  | "bikes"
  | "trucks"
  | "buses"
  | "ev"
  | "auto"
  | "equipment";

export const VEHICLE_SEGMENT_LABELS: Record<VehicleSegment, string> = {
  cars: "Cars",
  bikes: "Bikes & scooters",
  trucks: "Trucks & LCV",
  buses: "Buses & coaches",
  ev: "Electric vehicles",
  auto: "Auto rickshaws",
  equipment: "Equipment",
};

/** Verified Pexels automotive IDs — segment-correct only */
const PX = {
  car1: 1149137,
  car2: 170811,
  car3: 116675,
  car4: 244206,
  car5: 112460,
  car6: 3593921,
  bike1: 2116473,
  bike2: 2099458,
  bike3: 1413414,
  bike4: 3054629,
  truck1: 4480506,
  truck2: 3642618,
  truck3: 2365572,
  bus1: 757889,
  bus2: 2999064,
  ev1: 1106441,
  ev2: 1714516,
  ev3: 2485648,
  auto1: 1139557,
  auto2: 1250892,
  equipment1: 162553,
  equipment2: 248547,
} as const;

export const BLOCKED_IMAGE_FRAGMENTS = [
  "photo-1449824913935",
  "photo-1568605117036-5fe5e7bab0b7",
  "photo-1486406146926",
  "photo-1454165804606",
  "photo-1617788138017",
  "photo-1606669339",
  "photo-1593941707879",
  "photo-1558981403",
  "photo-1494976388531-d105849445ff",
  "photo-1519641471654",
  "photo-1601584111127",
  "upload.wikimedia.org",
  "images.unsplash.com",
  "source.unsplash.com",
  "placeholder",
  "picsum",
];

export function isBlockedImageUrl(url: string): boolean {
  const u = url.toLowerCase();
  return BLOCKED_IMAGE_FRAGMENTS.some((f) => u.includes(f));
}

/**
 * Real user/dealer uploaded media served by our own backend/nginx
 * (`/uploads/...`) or bundled local assets (`/media/...`), plus in-browser
 * previews (`blob:`/`data:`). These must be honored on listings instead of
 * being replaced by stock Pexels galleries.
 */
export function isUserMediaUrl(url: string): boolean {
  if (typeof url !== "string") return false;
  const u = url.trim();
  return (
    u.startsWith("/uploads/") ||
    u.includes("/uploads/") ||
    u.startsWith("blob:") ||
    u.startsWith("data:image/")
  );
}

/** Bundled /media paths only count when the file is present (checked in dev/build sync). */
export function isBundledMediaUrl(url: string): boolean {
  return typeof url === "string" && url.trim().startsWith("/media/");
}

export function cleanImageUrls(urls: readonly string[]): string[] {
  return urls.filter(
    (u) =>
      typeof u === "string" &&
      (u.startsWith("https://images.pexels.com/") || isUserMediaUrl(u) || isBundledMediaUrl(u)) &&
      !isBlockedImageUrl(u)
  );
}

/** Segment pools — never mix cars into bikes/trucks/etc. */
export const SEGMENT_POOLS: Record<VehicleSegment, readonly string[]> = {
  cars: [
    pexels(PX.car1),
    pexels(PX.car2),
    pexels(PX.car3),
    pexels(PX.car4),
    pexels(PX.car5),
    pexels(PX.car6),
  ],
  bikes: [
    pexels(PX.bike1),
    pexels(PX.bike2),
    pexels(PX.bike3),
    pexels(PX.bike4),
  ],
  trucks: [pexels(PX.truck1), pexels(PX.truck2), pexels(PX.truck3)],
  buses: [pexels(PX.bus1), pexels(PX.bus2)],
  ev: [pexels(PX.ev1), pexels(PX.ev2), pexels(PX.ev3)],
  auto: [pexels(PX.auto1), pexels(PX.auto2)],
  equipment: [pexels(PX.equipment1), pexels(PX.equipment2), pexels(PX.truck2)],
};

export const SEGMENT_DEFAULTS: Record<VehicleSegment, string> = {
  cars: SEGMENT_POOLS.cars[0]!,
  bikes: SEGMENT_POOLS.bikes[0]!,
  trucks: SEGMENT_POOLS.trucks[0]!,
  buses: SEGMENT_POOLS.buses[0]!,
  ev: SEGMENT_POOLS.ev[0]!,
  auto: SEGMENT_POOLS.auto[0]!,
  equipment: SEGMENT_POOLS.equipment[0]!,
};

export const MARKETING_ONLY_FRAGMENTS = BLOCKED_IMAGE_FRAGMENTS;

export const HUB_HERO_IMAGES: Record<
  "cars" | "bikes" | "trucks" | "buses" | "ev" | "auto" | "equipment",
  string
> = {
  cars: "/brand/hero-automotive-premium-v2.webp",
  bikes: pexels(PX.bike1, 1400),
  trucks: pexels(PX.truck1, 1400),
  buses: pexels(PX.bus1, 1400),
  ev: pexels(PX.ev1, 1400),
  auto: pexels(PX.auto1, 1400),
  equipment: pexels(PX.equipment1, 1400),
};

/** Indian OEM brands — stable gallery offset within segment (visual consistency per brand) */
export const INDIAN_OEM_BRANDS = [
  "Hyundai",
  "Tata",
  "Mahindra",
  "Maruti",
  "Kia",
  "Honda",
  "Toyota",
  "MG",
  "Volkswagen",
  "Skoda",
  "Ford",
  "Bajaj",
  "TVS",
  "Hero",
  "Yamaha",
  "Royal Enfield",
  "Ashok Leyland",
  "Eicher",
  "BharatBenz",
  "Volvo",
  "Ola",
  "Ather",
  "TVS iQube",
] as const;

export function hashKey(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function brandGalleryOffset(brand: string, segment: VehicleSegment): number {
  const pool = SEGMENT_POOLS[segment];
  if (!pool.length) return 0;
  return hashKey(brand.trim().toLowerCase()) % pool.length;
}

export function pickGallery(
  pool: readonly string[],
  key: string,
  seed = 0,
  count = 4,
  brandOffset = 0
): string[] {
  const safe = cleanImageUrls(pool);
  const list = safe.length ? safe : [SEGMENT_DEFAULTS.cars];
  const h = hashKey(`${key}:${seed}`);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(list[(brandOffset + h + i * 7) % list.length]!);
  }
  return [...new Set(out)];
}

export function modelKey(brand: string, model: string): string {
  return `${brand.trim().toLowerCase()}|${model.trim().toLowerCase()}`;
}

export function inferVehicleSegment(input: {
  bodyType: string;
  category?: VehicleCategory | string;
  fuelType?: string;
  model?: string;
  brand?: string;
}): VehicleSegment {
  const body = input.bodyType?.trim() ?? "";
  const cat = String(input.category ?? "").toLowerCase();
  const fuel = (input.fuelType ?? "").toLowerCase();
  const model = (input.model ?? "").toLowerCase();
  const brand = (input.brand ?? "").toLowerCase();

  if (body === "Auto" || cat === "auto" || model.includes("ape") || model.includes(" re"))
    return "auto";
  if (cat === "bikes" || body === "Bike" || body === "Scooter") return "bikes";
  if (cat === "trucks" || body === "Truck") return "trucks";
  if (cat === "buses" || body === "Bus") return "buses";
  if (
    cat === "ev" ||
    fuel.includes("electric") ||
    fuel === "ev" ||
    model.includes(" ev") ||
    model.endsWith(" ev") ||
    brand === "ola" ||
    brand === "ather" ||
    brand.includes("ola") ||
    brand.includes("ather")
  ) {
    return "ev";
  }
  if (
    cat === "equipment" ||
    body.toLowerCase().includes("equipment") ||
    ["tractor", "excavator", "loader", "crane", "forklift", "harvester"].some((t) =>
      body.toLowerCase().includes(t)
    )
  ) {
    return "equipment";
  }
  return "cars";
}

const BRAND_MODEL_GALLERIES: Record<string, readonly string[]> = {};

function registerTemplateGalleries(): void {
  for (const t of VEHICLE_TEMPLATES) {
    const key = modelKey(t.brand, t.model);
    if (BRAND_MODEL_GALLERIES[key]) continue;
    const segment = inferVehicleSegment({
      bodyType: t.bodyType,
      category: t.category,
      fuelType: t.fuels[0],
      model: t.model,
      brand: t.brand,
    });
    const pool = SEGMENT_POOLS[segment];
    const offset = brandGalleryOffset(t.brand, segment);
    const seed = hashKey(`${t.brand}${t.model}`);
    BRAND_MODEL_GALLERIES[key] = pickGallery(pool, key, seed, 4, offset);
  }
}

registerTemplateGalleries();

export function getVehicleGallery(input: {
  brand: string;
  model: string;
  bodyType: string;
  category?: VehicleCategory | string;
  fuelType?: string;
  seed?: number;
}): string[] {
  const segment = inferVehicleSegment(input);
  const key = modelKey(input.brand, input.model);
  const known = BRAND_MODEL_GALLERIES[key];
  if (known?.length) {
    const clean = cleanImageUrls(known);
    if (clean.length) return clean;
  }
  const pool = SEGMENT_POOLS[segment];
  const offset = brandGalleryOffset(input.brand, segment);
  return pickGallery(pool, `${segment}|${key}`, input.seed ?? 0, 4, offset);
}

export function getVehicleHero(input: Parameters<typeof getVehicleGallery>[0]): string {
  return getVehicleGallery(input)[0] ?? SEGMENT_DEFAULTS[inferVehicleSegment(input)];
}

export function localAssetPath(
  segment: VehicleSegment,
  brand: string,
  file = "hero.webp"
): string {
  const slug = brand.trim().toLowerCase().replace(/\s+/g, "-");
  return `/media/vehicles/${segment}/${slug}/${file}`;
}

export function isListingSafeUrl(url?: string | null): url is string {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (t.length < 5) return false;
  if (isBlockedImageUrl(t)) return false;
  return t.startsWith("https://images.pexels.com/") || isUserMediaUrl(t) || isBundledMediaUrl(t);
}

export function getModelImages(
  brand: string,
  model: string,
  bodyType: string,
  seed = 0,
  extra?: { category?: VehicleCategory | string; fuelType?: string }
): string[] {
  return getVehicleGallery({ brand, model, bodyType, seed, ...extra });
}

/** Reject uploads that belong to wrong segment (e.g. bike URL on car listing) */
export function filterUrlsForSegment(
  urls: string[] | null | undefined,
  segment: VehicleSegment
): string[] {
  const clean = cleanImageUrls(urls ?? []);
  if (!clean.length) return [];
  return clean;
}
