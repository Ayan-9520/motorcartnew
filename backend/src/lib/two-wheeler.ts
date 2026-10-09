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

/** Two-wheeler-only brands in India (Honda, Suzuki, BMW also make cars, so they are not listed). */
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

export function isTwoWheeler(v: { brand?: string | null; bodyType?: string | null }): boolean {
  return (
    TWO_WHEELER_BODY_TYPES.has(String(v.bodyType ?? "").trim().toLowerCase()) ||
    TWO_WHEELER_ONLY_BRANDS.has(String(v.brand ?? "").trim().toLowerCase())
  );
}
