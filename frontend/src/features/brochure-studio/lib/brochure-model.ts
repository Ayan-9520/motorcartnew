import type { VehicleListing } from "@/types/vehicle";
import { vehicleDetailPath } from "@/lib/vehicle-utils";
import { calculateEmiMonthly } from "@/features/dealer-crm/data/indian-automobile-catalog";
import { imagesByAngle, readPhotoAngles, type PhotoAngle } from "@/lib/photo-angles";
import type {
  BrochureBranding,
  BrochureContent,
  BrochureImageSelection,
  BrochureSpec,
  BrochureTemplateId,
  BrochureVehicle,
} from "../types";

const SPEC_ORDER: [string, string][] = [
  ["engine", "Engine"],
  ["battery", "Battery"],
  ["rangeKm", "Range"],
  ["power", "Power"],
  ["torque", "Torque"],
  ["mileage", "Mileage"],
  ["transmission", "Transmission"],
  ["fuel", "Fuel"],
  ["driveType", "Drive"],
  ["seating", "Seating"],
  ["bootSpace", "Boot Space"],
  ["groundClearance", "Ground Clearance"],
  ["airbags", "Airbags"],
  ["bodyType", "Body Type"],
];

export function formatLakh(amount: number): string {
  if (!(amount > 0)) return "Price on request";
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2).replace(/\.?0+$/, "")} Lakh`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatRupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "";
}

const UPPER_WORDS = new Set(["cng", "lpg", "ev", "amt", "dct", "cvt", "ivt", "mt", "at", "awd", "fwd", "rwd", "4wd", "suv", "muv", "imt"]);

/** "petrol" → "Petrol", "amt" → "AMT" (DB stores normalised lowercase fuel / gearbox). */
function niceCase(v: string): string {
  if (!v || /[A-Z]/.test(v)) return v;
  return v
    .split(/(\s+|\/|-)/)
    .map((w) => (UPPER_WORDS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("");
}

export function toBrochureVehicle(v: VehicleListing): BrochureVehicle {
  const meta = (v.metadata ?? {}) as Record<string, unknown>;
  const specMeta = (meta.specifications ?? {}) as Record<string, unknown>;
  const specs: BrochureSpec[] = [];
  const seen = new Set<string>();
  const push = (key: string, label: string, value: string) => {
    if (!value || seen.has(key)) return;
    seen.add(key);
    specs.push({ key, label, value });
  };
  for (const [key, label] of SPEC_ORDER) {
    const fallback =
      key === "transmission" ? v.transmission : key === "fuel" ? v.fuelType : key === "bodyType" ? v.bodyType : "";
    const raw = str(specMeta[key]) || str(fallback);
    push(key, label, ["fuel", "transmission", "bodyType", "driveType"].includes(key) ? niceCase(raw) : raw);
  }
  for (const [key, value] of Object.entries(specMeta)) {
    if (seen.has(key) || typeof value !== "string" || !value.trim() || key.length > 30) continue;
    push(key, key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), value.trim());
  }

  const images = (v.images ?? []).filter(Boolean);
  const priceOnRequest = Boolean(meta.priceOnRequest) || !(v.price > 0);
  return {
    id: v.id,
    title: v.title,
    brand: v.brand,
    model: v.model,
    variant: v.variant ?? "",
    year: v.year,
    condition: v.condition === "new" ? "new" : "used",
    price: v.price,
    priceOnRequest,
    fuel: niceCase(v.fuelType ?? ""),
    transmission: niceCase(v.transmission ?? ""),
    bodyType: v.bodyType ?? "",
    kms: v.kmsDriven ?? 0,
    owners: v.owners ?? 0,
    color: v.color ?? "",
    city: v.city ?? "",
    state: v.state ?? "",
    registration: str(meta.rto) || str(meta.registrationNumber) || "",
    insuranceValid: str(meta.insuranceValid),
    isCertified: Boolean(v.isCertified),
    specs,
    features: (v.features ?? []).map((f) => String(f).trim()).filter(Boolean),
    images,
    angles: readPhotoAngles(meta, images),
    listingPath: vehicleDetailPath(v),
  };
}

export function specValue(v: BrochureVehicle, key: string): string {
  return v.specs.find((s) => s.key === key)?.value ?? "";
}

export function ownerLabel(owners: number): string {
  if (owners <= 0) return "New";
  const n = ["", "1st", "2nd", "3rd"][owners] ?? `${owners}th`;
  return `${n} Owner`;
}

/** Rule-based highlights from real listing data only (never invented). */
export function ruleHighlights(v: BrochureVehicle): string[] {
  const out: string[] = [...v.features];
  const add = (s: string) => {
    if (s && !out.some((x) => x.toLowerCase() === s.toLowerCase())) out.push(s);
  };
  const power = specValue(v, "power");
  const torque = specValue(v, "torque");
  if (power) add(`${power} power`);
  if (torque) add(`${torque} torque`);
  const mileage = specValue(v, "mileage");
  if (mileage) add(`${mileage} mileage`);
  const range = specValue(v, "rangeKm");
  if (range) add(`${range} claimed range`);
  const airbags = specValue(v, "airbags");
  if (airbags) add(`${airbags} airbags`);
  const boot = specValue(v, "bootSpace");
  if (boot) add(`${boot} boot space`);
  const seating = specValue(v, "seating");
  if (seating) add(`${seating}-seater comfort`);
  const gc = specValue(v, "groundClearance");
  if (gc) add(`${gc} ground clearance`);
  if (v.fuel && v.transmission) add(`${v.fuel} · ${v.transmission}`);
  if (v.condition === "used") {
    if (v.owners === 1) add("Single owner");
    if (v.kms > 0) add(`Only ${v.kms.toLocaleString("en-IN")} km driven`);
  }
  return out.slice(0, 10);
}

const USED_BADGES = ["Verified Documents", "Accident Free", "Service History", "RC Transfer Support", "Finance Available", "Best Price"];
const NEW_BADGES = ["Easy Finance", "Fast Approval", "Insurance Support", "Exchange Bonus", "Lowest EMI"];

export function defaultContent(v: BrochureVehicle, template: BrochureTemplateId): BrochureContent {
  const isUsed = v.condition === "used";
  const priceText = v.priceOnRequest ? "Price on request" : `${formatLakh(v.price)}${isUsed ? "" : "*"}`;
  const name = [v.brand, v.model].filter(Boolean).join(" ");
  const highlights = ruleHighlights(v);
  const headline =
    template === "feature_highlights"
      ? `${Math.max(highlights.length, 1)} Reasons to Choose`
      : template === "finance_offer"
        ? "Drive Your Dream Easier Than Ever"
        : template === "lifestyle"
          ? `Make Every Drive Count`
          : template === "comparison"
            ? "Two Great Choices. One Smart Decision."
            : template === "custom"
              ? `${name} — Now Available`
              : isUsed
                ? `${name} ${v.variant}`.trim() + ` (${v.year})`
                : name;
  return {
    headline,
    tagline: isUsed
      ? [v.bodyType ? `Premium ${v.bodyType}` : "", "Well Maintained", "Excellent Condition"].filter(Boolean).join(" | ")
      : v.variant
        ? `${v.variant} — available now`
        : "Available now at our showroom",
    priceText,
    priceNote: isUsed ? "Asking Price" : `Ex-showroom${v.city ? ` ${v.city}` : ""}`,
    features: highlights,
    trustBadges: isUsed ? USED_BADGES : NEW_BADGES,
    ctaText: isUsed ? "Enquire Now" : template === "comparison" ? "Get Best Offer" : "Book a Test Drive",
    offerBadge: template === "finance_offer" ? "SPECIAL OFFER" : isUsed && v.isCertified ? "CERTIFIED" : "",
    bodyText: highlights.slice(0, 4).join("\n"),
    downPayment: v.price > 0 ? Math.round((v.price * 0.12) / 1000) * 1000 : 0,
    interestRate: 9.5,
    tenureMonths: 60,
  };
}

export function emiFor(content: BrochureContent, price: number): number {
  const principal = Math.max(0, price - content.downPayment);
  if (!(principal > 0)) return 0;
  return calculateEmiMonthly(principal, content.interestRate, content.tenureMonths);
}

const GALLERY_ORDER: PhotoAngle[] = ["front", "side", "rear", "interior", "dashboard", "rear_seat", "boot", "tyres", "engine", "odometer"];

export function defaultImages(v: BrochureVehicle, compare?: BrochureVehicle | null): BrochureImageSelection {
  const byAngle = imagesByAngle(v.images, v.angles);
  const hero = byAngle.front ?? v.images[0] ?? "";
  const secondary = byAngle.rear ?? byAngle.boot ?? byAngle.side ?? v.images.find((u) => u !== hero) ?? "";
  const tagged = GALLERY_ORDER.map((a) => byAngle[a]).filter((u): u is string => Boolean(u));
  const untagged = v.images.filter((u) => !tagged.includes(u));
  const compareByAngle = compare ? imagesByAngle(compare.images, compare.angles) : {};
  return {
    heroUrl: hero,
    secondaryUrl: secondary,
    galleryUrls: [...tagged, ...untagged].slice(0, 8),
    compareHeroUrl: compare ? compareByAngle.front ?? compare.images[0] ?? "" : "",
  };
}

export function defaultBranding(
  dealer: { name?: string; phone?: string; city?: string; logoUrl?: string } | null,
  v: BrochureVehicle | null,
  fallbackPhone?: string
): BrochureBranding {
  return {
    dealerName: dealer?.name ?? "",
    dealerTagline: v?.condition === "new" && v.brand ? `Authorised Dealer – ${v.brand}` : "Certified Pre-Owned Cars",
    phone: dealer?.phone ?? fallbackPhone ?? "",
    city: dealer?.city ?? v?.city ?? "",
    services: "Sales | Finance | Insurance | Exchange | Test Drive",
    logoUrl: dealer?.logoUrl ?? "",
    showDealerLogo: true,
    showContact: true,
    showWatermark: false,
    showQr: true,
  };
}

export type ComparisonRow = { label: string; a: string; b: string; kind: "value" | "check" };

export function comparisonRows(a: BrochureVehicle, b: BrochureVehicle, max = 14): ComparisonRow[] {
  const rows: ComparisonRow[] = [];
  const keys = new Set([...a.specs.map((s) => s.key), ...b.specs.map((s) => s.key)]);
  for (const [key, label] of SPEC_ORDER) {
    if (!keys.has(key)) continue;
    const va = specValue(a, key);
    const vb = specValue(b, key);
    if (!va && !vb) continue;
    rows.push({ label, a: va || "—", b: vb || "—", kind: "value" });
  }
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const featA = new Set(a.features.map(norm));
  const featB = new Set(b.features.map(norm));
  const allFeatures = [...a.features, ...b.features].filter((f, i, arr) => arr.findIndex((x) => norm(x) === norm(f)) === i);
  for (const f of allFeatures) {
    if (rows.length >= max) break;
    rows.push({ label: f, a: featA.has(norm(f)) ? "yes" : "no", b: featB.has(norm(f)) ? "yes" : "no", kind: "check" });
  }
  return rows.slice(0, max);
}

export function listingUrl(v: BrochureVehicle, campaign: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://motorcart.in";
  const sep = v.listingPath.includes("?") ? "&" : "?";
  return `${origin}${v.listingPath}${sep}utm_source=brochure&utm_medium=qr&utm_campaign=${encodeURIComponent(campaign)}`;
}
