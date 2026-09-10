/**
 * Vehicle paint / colour gallery — CarLelo-style image swap (not CSS recolor).
 * Each colour has its own image set (1600×900 target for production uploads).
 */

export type VehiclePaintColor = {
  /** Display name, e.g. Fearless Red */
  name: string;
  /** Swatch hex, e.g. #8B1E1E */
  hex: string;
  /** Per-colour photos (absolute or site-relative). First = hero. */
  images: string[];
  isDefault?: boolean;
};

export function normalizePaintColors(raw: unknown): VehiclePaintColor[] {
  if (!Array.isArray(raw) || !raw.length) return [];
  const out: VehiclePaintColor[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const name = item.trim();
      if (!name) continue;
      out.push({ name, hex: guessHexFromName(name), images: [] });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = String(o.name ?? o.color ?? o.colour ?? "").trim();
    if (!name) continue;
    const hexRaw = String(o.hex ?? o.hexCode ?? o.hex_code ?? "").trim();
    const hex = /^#?[0-9a-fA-F]{3,8}$/.test(hexRaw)
      ? hexRaw.startsWith("#")
        ? hexRaw
        : `#${hexRaw}`
      : guessHexFromName(name);
    const images = Array.isArray(o.images)
      ? (o.images as unknown[]).map((u) => String(u ?? "").trim()).filter(Boolean)
      : o.imageUrl || o.image_url || o.image
        ? [String(o.imageUrl ?? o.image_url ?? o.image)]
        : [];
    out.push({
      name,
      hex,
      images,
      isDefault: Boolean(o.isDefault ?? o.is_default),
    });
  }
  return out;
}

/** Common India OEM paint names → hex for swatches when API only sends names. */
export function guessHexFromName(name: string): string {
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const map: Record<string, string> = {
    white: "#F5F5F5",
    "pristine white": "#F4F4F0",
    "pearl white": "#F8F6F0",
    "atlas white": "#F2F2F2",
    black: "#1A1A1A",
    "napoli black": "#0D0D0D",
    red: "#B91C1C",
    "fearless red": "#9B1C1C",
    "flame red": "#C41E3A",
    grey: "#6B7280",
    gray: "#6B7280",
    "oxide grey": "#8A8F98",
    "daytona grey": "#4B5563",
    "daytona gray": "#4B5563",
    silver: "#C0C0C0",
    "splendid silver": "#B8BCC4",
    blue: "#1D4ED8",
    green: "#166534",
    "seaweed green": "#3F5D4A",
    orange: "#EA580C",
    brown: "#78350F",
    yellow: "#CA8A04",
  };
  if (map[n]) return map[n];
  for (const [k, v] of Object.entries(map)) {
    if (n.includes(k)) return v;
  }
  return "#64748B";
}

export function paintImagesForColor(
  color: VehiclePaintColor | undefined,
  fallbackImages: string[],
): string[] {
  const fromColor = (color?.images ?? []).filter(Boolean);
  if (fromColor.length) return fromColor;
  return fallbackImages.filter(Boolean);
}
