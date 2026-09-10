import { normalizePaintColors, type VehiclePaintColor } from "../lib/vehicle-paint";

const BASE = "/demo/cars/punch-ev";

/**
 * Demo: Tata Punch EV — 5 colours (CarLelo-style).
 * Each colour uses its own image (SVG stand-in until OEM/ChatGPT photos are uploaded).
 * Production target: 1600×900 WebP per colour.
 */
export const DEMO_PUNCH_EV_COLORS: VehiclePaintColor[] = [
  {
    name: "Oxide grey",
    hex: "#8A8F98",
    images: [`${BASE}/oxide-grey.svg`],
  },
  {
    name: "Seaweed Green",
    hex: "#3F5D4A",
    images: [`${BASE}/seaweed-green.svg`],
  },
  {
    name: "Fearless Red",
    hex: "#9B1C1C",
    images: [`${BASE}/fearless-red.svg`],
    isDefault: true,
  },
  {
    name: "Daytona Grey",
    hex: "#4B5563",
    images: [`${BASE}/daytona-grey.svg`],
  },
  {
    name: "Pristine White",
    hex: "#F4F4F0",
    images: [`${BASE}/pristine-white.svg`],
  },
];

export const DEMO_PUNCH_EV_META = {
  brand: "Tata",
  model: "Punch EV",
  title: "Tata Punch EV Colors (demo)",
  subtitle:
    "5 colour options — tap a swatch to swap the car image. Real OEM flow uses a separate photo per paint (not a CSS filter).",
};

/** Attach demo colours when listing looks like Punch EV / missing paint gallery. */
export function resolveListingPaintColors(opts: {
  brand?: string;
  model?: string;
  colorOptions?: unknown;
  colors?: unknown;
  fallbackToDemo?: boolean;
}): VehiclePaintColor[] {
  const fromMeta = normalizePaintColors(opts.colorOptions);
  if (fromMeta.length && fromMeta.some((c) => c.images.length > 0)) return fromMeta;

  const named = normalizePaintColors(opts.colors);
  const brand = (opts.brand ?? "").toLowerCase();
  const model = (opts.model ?? "").toLowerCase();
  const isPunchEv = brand.includes("tata") && model.includes("punch");

  if (isPunchEv || opts.fallbackToDemo) {
    if (named.length) {
      return DEMO_PUNCH_EV_COLORS.map((d) => {
        const hit = named.find((n) => n.name.toLowerCase() === d.name.toLowerCase());
        return hit ? { ...d, ...hit, images: hit.images.length ? hit.images : d.images } : d;
      });
    }
    return DEMO_PUNCH_EV_COLORS;
  }

  if (fromMeta.length) return fromMeta;
  return named;
}
