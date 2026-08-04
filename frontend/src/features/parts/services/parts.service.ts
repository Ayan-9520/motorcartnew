import type { HubCategorySlug } from "@/features/marketplace/types";
import { supabase } from "@/integrations/supabase/client";
import { partMatchesVehicleHub } from "@/lib/vehicle-hub-catalog";
import { resolvePartGallery } from "@/lib/media/resolve-images";
import type { DbPart, DbReview } from "@/types/database";
import { MOCK_PARTS_CATALOG } from "../data/mock-parts-catalog";
import { realDataOnly } from "@/config/real-data";
import type {
  PartCategorySlug,
  PartOrder,
  PartOrderItem,
  PartOrigin,
  PartProduct,
  PartReview,
  PartsSupplierAnalytics,
  PartsSupplierProfile,
} from "../types";
import { parseCategoryParam } from "../lib/part-utils";

const SELLER_PLACEHOLDER = "00000000-0000-0000-0000-000000000001";

function slugFromDbCategory(cat: string): PartCategorySlug {
  const parsed = parseCategoryParam(cat.toLowerCase().replace(/\s+/g, "-"));
  if (parsed) return parsed;
  const map: Record<string, PartCategorySlug> = {
    tyres: "tyres",
    tires: "tyres",
    batteries: "battery",
    battery: "battery",
    "engine-parts": "engine-parts",
    "brake-parts": "brake-parts",
    accessories: "accessories",
    lubricants: "lubricants",
    electronics: "electronics",
    "body-parts": "body-parts",
    "interior-parts": "interior-parts",
  };
  return map[cat.toLowerCase()] ?? "accessories";
}

export function mapDbPart(row: DbPart & { description?: string; sku?: string; gst_rate?: number; wholesale_price?: number; bulk_min_qty?: number }): PartProduct {
  const cat = slugFromDbCategory(row.category);
  return {
    id: row.id,
    sellerId: row.seller_id,
    name: row.name,
    slug: row.slug,
    categorySlug: cat,
    brand: row.brand,
    price: Number(row.price),
    originalPrice: row.original_price != null ? Number(row.original_price) : null,
    wholesalePrice: row.wholesale_price != null ? Number(row.wholesale_price) : null,
    gstRate: row.gst_rate != null ? Number(row.gst_rate) : 18,
    stock: row.stock,
    bulkMinQty: row.bulk_min_qty ?? 1,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    images: resolvePartGallery(cat, row.slug, row.images),
    compatibility: row.compatibility ?? [],
    vehicleHubs: (row as { vehicle_hubs?: HubCategorySlug[] }).vehicle_hubs,
    isFeatured: row.is_featured,
    isActive: row.is_active,
    description: row.description ?? null,
    sku: row.sku ?? null,
    partOrigin: ((row as { part_origin?: string }).part_origin as PartOrigin) ?? "aftermarket",
    mrp: (row as { mrp?: number }).mrp != null ? Number((row as { mrp?: number }).mrp) : null,
    supplierSku: (row as { supplier_sku?: string }).supplier_sku ?? null,
    createdAt: row.created_at,
  };
}

function mergeCatalog(db: PartProduct[]): PartProduct[] {
  return db;
}

export async function fetchParts(filters?: {
  category?: PartCategorySlug;
  search?: string;
  featured?: boolean;
  hub?: HubCategorySlug | null;
  origin?: PartOrigin;
}): Promise<PartProduct[]> {
  let q = supabase.from("parts").select("*").eq("is_active", true).order("is_featured", { ascending: false });
  if (filters?.featured) q = q.eq("is_featured", true);

  const { data, error } = await q;
  let list: PartProduct[] = [];
  if (!error && data?.length) {
    list = (data as DbPart[]).map((r) => mapDbPart(r as Parameters<typeof mapDbPart>[0]));
  }

  list = mergeCatalog(list);

  if (filters?.category) list = list.filter((p) => p.categorySlug === filters.category);
  if (filters?.hub) list = list.filter((p) => partMatchesVehicleHub(p, filters.hub!));
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.brand?.toLowerCase().includes(s) ?? false) ||
        p.compatibility.some((c) => c.toLowerCase().includes(s))
    );
  }
  if (filters?.featured) list = list.filter((p) => p.isFeatured);

  return list;
}

export async function fetchPartBySlug(category: string | undefined, slug: string): Promise<PartProduct | null> {
  const cat = parseCategoryParam(category);
  const { data } = await supabase.from("parts").select("*").eq("slug", slug).maybeSingle();
  if (data) {
    const p = mapDbPart(data as Parameters<typeof mapDbPart>[0]);
    if (cat && p.categorySlug !== cat) {
      if (realDataOnly) return null;
      return MOCK_PARTS_CATALOG.find((m) => m.slug === slug && m.categorySlug === cat) ?? p;
    }
    return p;
  }
  if (realDataOnly) return null;
  return MOCK_PARTS_CATALOG.find((p) => p.slug === slug && (!cat || p.categorySlug === cat)) ?? null;
}

export async function fetchPartReviews(partId: string): Promise<PartReview[]> {
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("entity_type", "part")
    .eq("entity_id", partId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (data?.length) {
    return (data as DbReview[]).map((r) => ({
      id: r.id,
      userId: r.user_id,
      rating: r.rating,
      title: r.title,
      content: r.content,
      createdAt: r.created_at,
    }));
  }

  return [
    { id: "r1", userId: "u1", rating: 5, title: "Genuine product", content: "Fast delivery, OEM packaging.", createdAt: new Date().toISOString() },
    { id: "r2", userId: "u2", rating: 4, title: "Good value", content: "Works as expected.", createdAt: new Date().toISOString() },
  ];
}

export async function postPartReview(partId: string, userId: string, rating: number, title: string, content: string) {
  return supabase.from("reviews").insert({
    user_id: userId,
    entity_type: "part",
    entity_id: partId,
    rating,
    title,
    content,
  });
}

export async function submitPartOrder(payload: {
  items: { part_id: string; qty: number }[];
  payment_method: "cod" | "online" | "whatsapp";
  shipping: Record<string, unknown>;
  cod: boolean;
}) {
  const { data, error } = await supabase.rpc("create_part_order", {
    p_items: payload.items,
    p_payment_method: payload.payment_method,
    p_shipping: payload.shipping,
    p_cod: payload.cod,
  });

  if (!error && data && (data as { ok: boolean }).ok) {
    return { ok: true, data: data as Record<string, unknown> };
  }

  const mockId = `local-${Date.now()}`;
  const orders = JSON.parse(localStorage.getItem("motorcart_part_orders") ?? "[]") as PartOrder[];
  const uid = String(payload.shipping.userId ?? "local");
  let sub = 0;
  let gst = 0;
  let tot = 0;
  const items: PartOrderItem[] = payload.items.map((it, idx) => {
    const part = MOCK_PARTS_CATALOG.find((p) => p.id === it.part_id);
    const unit = part?.price ?? 0;
    const lineTotal = unit * it.qty;
    const lineSub = Math.round(lineTotal / (1 + (part?.gstRate ?? 18) / 100));
    const lineGst = lineTotal - lineSub;
    sub += lineSub;
    gst += lineGst;
    tot += lineTotal;
    return {
      id: `li-${mockId}-${idx}`,
      partId: it.part_id,
      partName: part?.name,
      sellerId: part?.sellerId ?? SELLER_PLACEHOLDER,
      qty: it.qty,
      unitPrice: unit,
      gstRate: part?.gstRate ?? 18,
      lineSubtotal: lineSub,
      lineGst: lineGst,
      lineTotal: lineTotal,
    };
  });

  orders.unshift({
    id: mockId,
    userId: uid,
    status: "confirmed",
    paymentMethod: payload.payment_method,
    codConfirmed: payload.cod,
    subtotal: sub,
    gstTotal: gst,
    grandTotal: tot,
    shippingAddress: payload.shipping,
    trackingNumber: null,
    carrier: null,
    invoiceNumber: `INV-MC-DEMO-${Date.now()}`,
    invoiceSnapshot: { subtotal: sub, gst_total: gst, grand_total: tot },
    items,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  localStorage.setItem("motorcart_part_orders", JSON.stringify(orders));
  return { ok: true, data: { order_id: mockId, invoice_number: orders[0].invoiceNumber, grand_total: 0 } };
}

export async function fetchPartOrderById(userId: string, orderId: string): Promise<PartOrder | null> {
  const { data } = await supabase
    .from("part_orders")
    .select("*, part_order_items(*)")
    .eq("user_id", userId)
    .eq("id", orderId)
    .maybeSingle();

  if (data) {
    return mapOrderRow(data as Record<string, unknown> & { part_order_items?: Record<string, unknown>[] });
  }

  const local = JSON.parse(localStorage.getItem("motorcart_part_orders") ?? "[]") as PartOrder[];
  return local.find((o) => o.id === orderId && o.userId === userId) ?? null;
}

export async function fetchMyPartOrders(userId: string): Promise<PartOrder[]> {
  const { data } = await supabase
    .from("part_orders")
    .select("*, part_order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const mapped = (data ?? []).map((row) =>
    mapOrderRow(row as Record<string, unknown> & { part_order_items?: Record<string, unknown>[] })
  );
  const local = JSON.parse(localStorage.getItem("motorcart_part_orders") ?? "[]") as PartOrder[];
  return [...mapped, ...local.filter((o) => o.userId === userId)];
}

export async function fetchSellerPartOrders(): Promise<PartOrder[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("part_order_items")
    .select("order_id, part_orders(*)")
    .eq("seller_id", user.id);

  const byOrder = new Map<string, PartOrder>();
  (rows ?? []).forEach((row: unknown) => {
    const r = row as { order_id: string; part_orders: Record<string, unknown> | Record<string, unknown>[] | null };
    const o = Array.isArray(r.part_orders) ? r.part_orders[0] : r.part_orders;
    if (!o?.id) return;
    const id = String(o.id);
    if (!byOrder.has(id)) {
      byOrder.set(id, mapOrderRow({ ...o, part_order_items: [] } as Record<string, unknown> & { part_order_items?: never[] }));
    }
  });
  return Array.from(byOrder.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function mapOrderRow(row: Record<string, unknown> & { part_order_items?: Record<string, unknown>[] }): PartOrder {
  const items = (row.part_order_items ?? []).map(
    (i): PartOrderItem => ({
      id: String(i.id),
      partId: String(i.part_id),
      sellerId: String(i.seller_id),
      qty: Number(i.qty),
      unitPrice: Number(i.unit_price),
      gstRate: Number(i.gst_rate),
      lineSubtotal: Number(i.line_subtotal),
      lineGst: Number(i.line_gst),
      lineTotal: Number(i.line_total),
    })
  );

  return {
    id: String(row.id),
    userId: String(row.user_id),
    status: row.status as PartOrder["status"],
    paymentMethod: row.payment_method as PartOrder["paymentMethod"],
    codConfirmed: Boolean(row.cod_confirmed),
    subtotal: Number(row.subtotal ?? 0),
    gstTotal: Number(row.gst_total ?? 0),
    grandTotal: Number(row.grand_total ?? 0),
    shippingAddress: (row.shipping_address as Record<string, unknown>) ?? {},
    trackingNumber: row.tracking_number as string | null,
    carrier: row.carrier as string | null,
    invoiceNumber: row.invoice_number as string | null,
    invoiceSnapshot: (row.invoice_snapshot as Record<string, unknown>) ?? null,
    items,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function updatePartOrderTracking(orderId: string, tracking: string, carrier: string) {
  return supabase.from("part_orders").update({ tracking_number: tracking, carrier, status: "shipped" }).eq("id", orderId);
}

export async function insertPart(
  sellerId: string,
  payload: {
    name: string;
    slug: string;
    category: string;
    brand?: string;
    price: number;
    original_price?: number;
    stock: number;
    images: string[];
    compatibility: string[];
    description?: string;
    sku?: string;
    gst_rate?: number;
    wholesale_price?: number;
    bulk_min_qty?: number;
    is_featured?: boolean;
  }
) {
  return supabase.from("parts").insert({
    seller_id: sellerId,
    name: payload.name,
    slug: payload.slug,
    category: payload.category,
    brand: payload.brand ?? null,
    price: payload.price,
    original_price: payload.original_price ?? null,
    stock: payload.stock,
    images: payload.images,
    compatibility: payload.compatibility,
    is_featured: payload.is_featured ?? false,
    is_active: true,
    description: payload.description ?? null,
    sku: payload.sku ?? null,
    gst_rate: payload.gst_rate ?? 18,
    wholesale_price: payload.wholesale_price ?? null,
    bulk_min_qty: payload.bulk_min_qty ?? 1,
  });
}

export async function updatePartStock(partId: string, stock: number) {
  return supabase.from("parts").update({ stock }).eq("id", partId);
}

export async function fetchSellerParts(sellerId: string): Promise<PartProduct[]> {
  const { data } = await supabase.from("parts").select("*").eq("seller_id", sellerId).order("updated_at", { ascending: false });
  return ((data ?? []) as DbPart[]).map((r) => mapDbPart(r as Parameters<typeof mapDbPart>[0]));
}

export function computeSupplierAnalytics(parts: PartProduct[], orders: PartOrder[]): PartsSupplierAnalytics {
  return {
    activeSkus: parts.filter((p) => p.isActive).length,
    lowStock: parts.filter((p) => p.stock < 10).length,
    oemCount: parts.filter((p) => p.partOrigin === "oem").length,
    aftermarketCount: parts.filter((p) => p.partOrigin === "aftermarket").length,
    inventoryValue: parts.reduce((s, p) => s + p.price * p.stock, 0),
    pendingOrders: orders.filter((o) => o.status === "pending" || o.status === "confirmed").length,
  };
}

export async function updatePartPricing(
  partId: string,
  patch: { price?: number; wholesale_price?: number; stock?: number; part_origin?: PartOrigin }
) {
  return supabase.from("parts").update(patch).eq("id", partId);
}

export async function updatePartOrderStatus(orderId: string, status: PartOrder["status"]) {
  return supabase.from("part_orders").update({ status }).eq("id", orderId);
}

export async function fetchSupplierProfile(userId: string): Promise<PartsSupplierProfile | null> {
  const { data } = await supabase.from("parts_supplier_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    businessName: data.business_name,
    gstin: data.gstin,
    tier: data.tier as PartsSupplierProfile["tier"],
    cities: data.cities ?? [],
    isVerified: data.is_verified,
  };
}
