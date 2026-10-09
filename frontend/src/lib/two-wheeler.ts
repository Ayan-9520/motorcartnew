/** Body types used for motorcycles / scooters across the Bikes hub and bulk upload. */
const TWO_WHEELER_BODY_TYPES = new Set([
  "bike",
  "bikes",
  "motorcycle",
  "motorbike",
  "scooter",
  "electric scooter",
  "moped",
  "commuter",
  "cruiser",
  "adventure",
  "naked",
  "street",
  "tourer",
  "off-road",
  "dirt bike",
  "cafe racer",
]);

/** Brands that sell only two-wheelers in India (Honda, Suzuki, BMW etc. are excluded — they make cars too). */
const TWO_WHEELER_ONLY_BRANDS = new Set([
  "royal enfield",
  "ktm",
  "ather",
  "ather energy",
  "ola",
  "ola electric",
  "hero",
  "hero motocorp",
  "hero electric",
  "tvs",
  "tvs motor",
  "bajaj",
  "yamaha",
  "kawasaki",
  "harley-davidson",
  "harley davidson",
  "triumph",
  "ducati",
  "jawa",
  "yezdi",
  "revolt",
  "ultraviolette",
  "husqvarna",
  "benelli",
  "aprilia",
  "vespa",
  "simple energy",
  "okinawa",
  "ampere",
  "bounce",
  "chetak",
]);

export function isTwoWheelerBodyType(bodyType: string | null | undefined): boolean {
  return TWO_WHEELER_BODY_TYPES.has(String(bodyType ?? "").trim().toLowerCase());
}

export function isTwoWheelerOnlyBrand(brand: string | null | undefined): boolean {
  return TWO_WHEELER_ONLY_BRANDS.has(String(brand ?? "").trim().toLowerCase());
}

export function isTwoWheeler(v: { brand?: string | null; bodyType?: string | null }): boolean {
  return isTwoWheelerBodyType(v.bodyType) || isTwoWheelerOnlyBrand(v.brand);
}
