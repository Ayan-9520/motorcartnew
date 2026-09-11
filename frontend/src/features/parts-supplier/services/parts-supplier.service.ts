import { realDataOnly } from "@/config/real-data";
import {
  computeSupplierAnalytics,
  fetchSellerPartOrders,
  fetchSellerParts,
  fetchSupplierProfile,
} from "@/features/parts/services/parts.service";
import type { PartProduct } from "@/features/parts/types";
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

export async function fetchPartsSupplierOrderDetail(
  orderId: string
): Promise<PsSupplierOrderDetail | null> {
  if (realDataOnly) return null;
  return getMockOrderDetail(orderId);
}
