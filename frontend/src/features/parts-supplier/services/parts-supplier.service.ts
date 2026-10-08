import { realDataOnly } from "@/config/real-data";
import {
  computeSupplierAnalytics,
  fetchSellerPartOrders,
  fetchSellerParts,
  fetchPartOrderById,
  fetchSupplierProfile,
  orderLineLabel,
} from "@/features/parts/services/parts.service";
import type { PartOrder, PartProduct } from "@/features/parts/types";
import {
  buildMockPartsSupplierSnapshot,
  emptyPartsSupplierSnapshot,
  getMockOrderDetail,
} from "../data/mock-ps-data";
import type { PartsSupplierSnapshot, PsCatalogProduct, PsSupplierOrder, PsSupplierOrderDetail } from "../types";

function mapPartToCatalog(p: PartProduct): PsCatalogProduct {
  const stock = p.stock;
  let stockHealth: PsCatalogProduct["stockHealth"] = "normal";
  if (stock <= 0) stockHealth = "dead";
  else if (stock < 10) stockHealth = "low";
  else if (stock > 50) stockHealth = "fast";

  const marginPct =
    p.wholesalePrice && p.wholesalePrice > 0
      ? Math.round(((p.price - p.wholesalePrice) / p.price) * 100)
      : 18;

  return {
    id: p.id,
    sku: p.sku ?? p.supplierSku ?? `SKU-${p.id.slice(0, 6)}`,
    oemCode: p.supplierSku ?? "—",
    name: p.name,
    brand: p.brand ?? "Generic",
    category: p.categorySlug.replace(/-/g, " "),
    stock,
    reserved: 0,
    retailPrice: p.price,
    wholesalePrice: p.wholesalePrice ?? Math.round(p.price * 0.82),
    marginPct,
    compatibility: p.compatibility,
    stockHealth,
  };
}

export async function fetchPartsSupplierSnapshot(
  sellerId: string,
  displayName?: string
): Promise<PartsSupplierSnapshot> {
  const businessName = displayName ? `${displayName} Auto Parts` : "Your parts business";
  const empty = emptyPartsSupplierSnapshot(businessName);
  const mock = realDataOnly ? empty : buildMockPartsSupplierSnapshot(businessName);

  try {
    const [parts, orders, profile] = await Promise.all([
      fetchSellerParts(sellerId),
      fetchSellerPartOrders(),
      fetchSupplierProfile(sellerId),
    ]);

    if (parts.length === 0 && orders.length === 0 && !profile) {
      return realDataOnly ? empty : mock;
    }

    const base = emptyPartsSupplierSnapshot(
      profile?.businessName ?? businessName,
      empty.profile.city
    );
    const analytics = computeSupplierAnalytics(parts, orders);

    if (profile) {
      base.profile = {
        ...base.profile,
        id: profile.id,
        businessName: profile.businessName,
        gstin: profile.gstin,
        isGstVerified: !!profile.gstin,
        tier: profile.tier,
        isVerified: profile.isVerified,
      };
    }

    if (parts.length > 0) {
      base.catalog = parts.map(mapPartToCatalog);
      base.metrics = base.metrics.map((m) => {
        if (m.key === "skus") return { ...m, value: analytics.activeSkus };
        if (m.key === "low_stock") return { ...m, value: analytics.lowStock };
        return m;
      });
    }

    if (orders.length > 0) {
      const mapped: PsSupplierOrder[] = orders.slice(0, 20).map((o) => ({
        id: o.id,
        orderNo: o.invoiceNumber ?? `MC-${o.id.slice(0, 8)}`,
        customerName: (o.shippingAddress?.name as string) ?? "Customer",
        customerType: "retail",
        status: o.status,
        grandTotal: o.grandTotal,
        itemCount: o.items.length,
        city: (o.shippingAddress?.city as string) ?? "—",
        paymentMode: o.paymentMethod,
        createdAt: o.createdAt,
      }));
      base.orders = mapped;
      base.pendingDispatch = orders.filter((x) =>
        ["pending", "confirmed", "packed"].includes(x.status)
      ).length;
      base.metrics = base.metrics.map((m) => {
        if (m.key === "dispatch") return { ...m, value: base.pendingDispatch };
        if (m.key === "orders_today") return { ...m, value: orders.length };
        return m;
      });
    }

    return base;
  } catch {
    return realDataOnly ? empty : mock;
  }
}

const TIMELINE_STEPS: { status: PartOrder["status"]; label: string }[] = [
  { status: "pending", label: "Order placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "packed", label: "Packed" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" },
];

function mapOrderDetail(o: PartOrder): PsSupplierOrderDetail {
  const addr = o.shippingAddress as Record<string, string | undefined>;
  const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const events = o.timeline ?? [];
  const steps = o.status === "cancelled" ? [...TIMELINE_STEPS.slice(0, 1), { status: "cancelled" as const, label: "Cancelled" }] : TIMELINE_STEPS;
  return {
    id: o.id,
    orderNo: o.invoiceNumber ?? `MC-${o.id.slice(0, 8)}`,
    customerName: addr.name ?? "Customer",
    customerType: o.gstin ? "wholesale" : "retail",
    status: o.status,
    grandTotal: o.grandTotal,
    itemCount: o.items.length,
    city: addr.city ?? "—",
    paymentMode: o.paymentMethod === "cod" ? "Cash on Delivery" : o.paymentMethod === "whatsapp" ? "WhatsApp confirm" : o.paymentMethod,
    createdAt: o.createdAt,
    gstin: o.gstin ?? undefined,
    phone: addr.phone ?? "—",
    trackingNumber: o.trackingNumber ?? undefined,
    carrier: o.carrier ?? undefined,
    warehouse: [addr.line1, addr.line2, addr.city, addr.state, addr.pin].filter(Boolean).join(", ") || "—",
    timeline: steps.map((s) => {
      const hit = events.find((e) => e.status === s.status);
      return { label: s.label, at: hit ? fmt(hit.at) : s.status === "pending" ? fmt(o.createdAt) : "—", done: !!hit || s.status === "pending" };
    }),
    items: o.items.map((i) => ({ name: orderLineLabel(i), sku: i.slug ?? i.partId.slice(0, 8), qty: i.qty, lineTotal: i.lineTotal })),
  };
}

export async function fetchPartsSupplierOrderDetail(
  orderId: string
): Promise<PsSupplierOrderDetail | null> {
  const order = await fetchPartOrderById("", orderId).catch(() => null);
  if (order) return mapOrderDetail(order);
  if (realDataOnly) return null;
  return getMockOrderDetail(orderId);
}
