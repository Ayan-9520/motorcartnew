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
  { id: "b2b", label: "B2B Wholesale", description: "Dealer slab pricing", icon: Percent, href: "/parts/browse?dealer=1" },
  { id: "gst", label: "GST Invoice", description: "B2B tax credit ready", icon: FileText, href: "/parts/browse" },
  { id: "cod", label: "COD Available", description: "Pay on delivery", icon: Truck, href: "/parts/browse?pay=cod" },
  { id: "same-day", label: "Same-day metro", description: "Mumbai · Delhi · BLR", icon: Zap, href: "/parts/browse?delivery=fast" },
  { id: "whatsapp", label: "WhatsApp order", description: "Bulk on chat", icon: MessageCircle, href: "/parts/browse" },
  { id: "ai", label: "AI PartsBot", description: "Fitment matched", icon: Sparkles, href: "/parts/browse" },
  { id: "warranty", label: "OEM warranty", description: "Brand authorised", icon: ShieldCheck, href: "/parts/browse" },
  { id: "fitment", label: "Fitment check", description: "By VIN / model", icon: Wrench, href: "/parts/browse" },
  { id: "emi", label: "Pay later / EMI", description: "For garages & fleets", icon: CreditCard, href: "/finance" },
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
  { label: "50K+", sub: "SKUs live" },
  { label: "2,400+", sub: "Verified sellers" },
  { label: "18%", sub: "GST on parts" },
  { label: "4.8★", sub: "Avg rating" },
];

/** Hero pills — live counts when real-data mode, demo stats otherwise */
export function partsTrustStatsForCatalog(skuCount: number, liveOnly: boolean) {
  if (liveOnly) {
    const countLabel = skuCount > 0 ? skuCount.toLocaleString("en-IN") : "0";
    return [
      { label: countLabel, sub: "SKUs live" },
      { label: "18%", sub: "GST on parts" },
      { label: "B2B", sub: "Wholesale ready" },
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
