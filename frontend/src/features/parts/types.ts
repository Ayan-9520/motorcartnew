import type { HubCategorySlug } from "@/features/marketplace/types";

export type PartCategorySlug =
  | "engine-parts"
  | "battery"
  | "tyres"
  | "brake-parts"
  | "accessories"
  | "lubricants"
  | "electronics"
  | "body-parts"
  | "interior-parts";

export interface PartCategory {
  slug: PartCategorySlug;
  label: string;
  description: string;
}

export const PART_CATEGORIES: PartCategory[] = [
  { slug: "engine-parts", label: "Engine Parts", description: "Filters, belts, gaskets & more" },
  { slug: "battery", label: "Battery", description: "OEM & aftermarket batteries" },
  { slug: "tyres", label: "Tyres", description: "All-season & performance tyres" },
  { slug: "brake-parts", label: "Brake Parts", description: "Pads, discs, fluid" },
  { slug: "accessories", label: "Accessories", description: "Mats, covers, lighting" },
  { slug: "lubricants", label: "Lubricants", description: "Engine oil, ATF, coolants" },
  { slug: "electronics", label: "Electronics", description: "Infotainment, sensors" },
  { slug: "body-parts", label: "Body Parts", description: "Bumpers, panels, mirrors" },
  { slug: "interior-parts", label: "Interior Parts", description: "Seats, trims, consoles" },
];

export type PartOrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PartPaymentMethod = "cod" | "online" | "whatsapp";

export type PartOrigin = "oem" | "aftermarket" | "genuine_accessory";

export const PART_ORIGIN_LABELS: Record<PartOrigin, string> = {
  oem: "OEM Genuine",
  aftermarket: "Aftermarket",
  genuine_accessory: "Genuine Accessory",
};

export interface PartProduct {
  id: string;
  sellerId: string;
  name: string;
  slug: string;
  categorySlug: PartCategorySlug;
  /** When set, part is shown only for these marketplace hubs; omit = fits all types */
  vehicleHubs?: HubCategorySlug[];
  brand: string | null;
  price: number;
  originalPrice: number | null;
  wholesalePrice: number | null;
  gstRate: number;
  stock: number;
  bulkMinQty: number;
  rating: number;
  reviewCount: number;
  images: string[];
  compatibility: string[];
  isFeatured: boolean;
  isActive: boolean;
  description: string | null;
  sku: string | null;
  partOrigin: PartOrigin;
  mrp: number | null;
  supplierSku: string | null;
  sellerName?: string | null;
  hsnCode?: string | null;
  createdAt: string;
}

export interface PartsSupplierProfile {
  id: string;
  userId: string;
  businessName: string;
  gstin: string | null;
  tier: "standard" | "preferred" | "oem_partner";
  cities: string[];
  isVerified: boolean;
}

export interface PartsSupplierAnalytics {
  activeSkus: number;
  lowStock: number;
  oemCount: number;
  aftermarketCount: number;
  inventoryValue: number;
  pendingOrders: number;
}

export interface PartReview {
  id: string;
  userId: string;
  rating: number;
  title: string | null;
  content: string | null;
  verifiedPurchase?: boolean;
  createdAt: string;
}

export interface PartOrderItem {
  id: string;
  partId: string;
  partName?: string;
  slug?: string;
  categorySlug?: PartCategorySlug;
  hsnCode?: string | null;
  sellerId: string;
  qty: number;
  unitPrice: number;
  gstRate: number;
  lineSubtotal: number;
  lineGst: number;
  lineTotal: number;
}

export interface PartOrder {
  id: string;
  userId: string;
  status: PartOrderStatus;
  paymentMethod: PartPaymentMethod;
  codConfirmed: boolean;
  subtotal: number;
  gstTotal: number;
  grandTotal: number;
  shippingAddress: Record<string, unknown>;
  trackingNumber: string | null;
  carrier: string | null;
  invoiceNumber: string | null;
  invoiceSnapshot: Record<string, unknown> | null;
  gstin?: string | null;
  timeline?: PartOrderTimelineEntry[];
  sellerIds?: string[];
  items: PartOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PartOrderTimelineEntry {
  status: PartOrderStatus;
  at: string;
  note?: string;
  by?: string;
}

export interface CartLine {
  partId: string;
  slug: string;
  name: string;
  categorySlug: PartCategorySlug;
  image: string;
  price: number;
  wholesalePrice: number | null;
  gstRate: number;
  bulkMinQty: number;
  sellerId: string;
  stock?: number;
  qty: number;
}
