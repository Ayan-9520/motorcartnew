import type { HubCategorySlug } from "@/features/marketplace/types";
import type { LucideIcon } from "lucide-react";
import {
  Battery,
  Car,
  CircleDot,
  Cog,
  CreditCard,
  Disc,
  Droplets,
  FileText,
  MessageCircle,
  Package,
  Percent,
  Radio,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";
import { PART_CATEGORIES, type PartCategorySlug } from "../types";

export interface PartsHubService {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export const PARTS_HUB_SERVICES: PartsHubService[] = [
  { id: "b2b", label: "Bulk pricing", description: "Lower rate at bulk qty", icon: Percent, href: "/parts/browse?dealer=1" },
  { id: "gst", label: "GST invoice", description: "Add GSTIN for input credit", icon: FileText, href: "/parts/browse" },
  { id: "cod", label: "Cash on Delivery", description: "Pay cash / UPI on arrival", icon: Truck, href: "/parts/browse?pay=cod" },
  { id: "ready", label: "Ready to ship", description: "Dispatch in 1–3 days", icon: Zap, href: "/parts/browse?delivery=fast" },
  { id: "whatsapp", label: "WhatsApp confirm", description: "Desk confirms fitment", icon: MessageCircle, href: "/parts/browse" },
  { id: "ai", label: "PartsBot picks", description: "Matched to your vehicle", icon: Sparkles, href: "/parts/browse" },
  { id: "tracking", label: "Live tracking", description: "Courier AWB in orders", icon: ShieldCheck, href: "/orders" },
  { id: "fitment", label: "Fitment help", description: "Share model & year", icon: Wrench, href: "/parts/browse" },
  { id: "sell", label: "Sell parts", description: "List your inventory", icon: CreditCard, href: "/dashboard/parts" },
];

export const PARTS_CATEGORY_ICONS: Record<PartCategorySlug, LucideIcon> = {
  "engine-parts": Cog,
  battery: Battery,
  tyres: CircleDot,
  "brake-parts": Disc,
  accessories: Package,
  lubricants: Droplets,
  electronics: Radio,
  "body-parts": Car,
  "interior-parts": Wrench,
};

export { PARTS_BRAND_TILES as PARTS_HUB_BRANDS } from "@/lib/media/india-media-catalog";

export const PARTS_TRUST_STATS = [
  { label: "Catalog", sub: "Parts SKUs" },
  { label: "Sellers", sub: "Verified sellers" },
  { label: "18%", sub: "GST on parts" },
  { label: "Ratings", sub: "Buyer feedback" },
];

/** Hero pills — live counts when real-data mode, demo stats otherwise */
export function partsTrustStatsForCatalog(skuCount: number, liveOnly: boolean) {
  if (liveOnly) {
    const countLabel = skuCount > 0 ? skuCount.toLocaleString("en-IN") : "0";
    return [
      { label: countLabel, sub: "SKUs live" },
      { label: "GST", sub: "Invoice on every order" },
      { label: "Bulk", sub: "Tier pricing" },
      { label: "COD", sub: "Pay on delivery" },
    ];
  }
  return PARTS_TRUST_STATS;
}

export const PARTS_VEHICLE_CHIPS = [
  "All vehicles",
  "Maruti Swift",
  "Hyundai Creta",
  "Honda City",
  "Tata Nexon",
  "Mahindra Scorpio",
] as const;

export function partsCategoryHref(slug: PartCategorySlug): string {
  return `/parts/${slug}`;
}

export function partsBrowsePath(params?: { q?: string; vehicle?: string; hub?: HubCategorySlug | null }): string {
  const s = new URLSearchParams();
  if (params?.q) s.set("q", params.q);
  if (params?.vehicle && params.vehicle !== "All vehicles") s.set("vehicle", params.vehicle);
  if (params?.hub) s.set("hub", params.hub);
  const qs = s.toString();
  return qs ? `/parts/browse?${qs}` : "/parts/browse";
}

export { PART_CATEGORIES };
