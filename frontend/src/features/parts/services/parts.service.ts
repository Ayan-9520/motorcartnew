import axios from "axios";
import type { HubCategorySlug } from "@/features/marketplace/types";
import { supabase } from "@/integrations/supabase/client";
import { api, apiErrorMessage } from "@/lib/api/axios";
import { partMatchesVehicleHub } from "@/lib/vehicle-hub-catalog";
import { resolvePartGallery } from "@/lib/media/resolve-images";
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
import { partArtworkUri } from "../lib/part-artwork";

type ApiResult = { error: { message: string } | null };

async function mutate(run: () => Promise<unknown>): Promise<ApiResult> {
  try {
    await run();
    return { error: null };
  } catch (e) {
    return { error: { message: apiErrorMessage(e) } };
  }
}

function isStatus(e: unknown, ...codes: number[]) {
  return axios.isAxiosError(e) && codes.includes(e.response?.status ?? 0);
}

export function mapApiPart(row: PartProduct): PartProduct {
  const cat = parseCategoryParam(row.categorySlug) ?? "accessories";
  const uploaded = (row.images ?? []).filter((u) => typeof u === "string" && /^(https:\/\/|\/uploads\/)/.test(u));
  return {
    ...row,
    categorySlug: cat,
    images: uploaded.length ? resolvePartGallery(cat, row.slug, uploaded) : [partArtworkUri({ ...row, categorySlug: cat })],
    compatibility: row.compatibility ?? [],
  };
}

export async function fetchParts(filters?: {
  category?: PartCategorySlug;
  search?: string;
  featured?: boolean;
  hub?: HubCategorySlug | null;
  origin?: PartOrigin;
}): Promise<PartProduct[]> {
  try {
    const { data } = await api.get<{ data: PartProduct[] }>("/api/parts/catalog", {
      params: {
        category: filters?.category,
        q: filters?.search?.trim() || undefined,
        hub: filters?.hub ?? undefined,
        origin: filters?.origin,
        featured: filters?.featured ? "true" : undefined,
      },
    });
    let list = (data.data ?? []).map(mapApiPart);
    if (filters?.hub) list = list.filter((p) => partMatchesVehicleHub(p, filters.hub!));
    return list;
  } catch {
    return [];
  }
}

export async function fetchPartBySlug(_category: string | undefined, slug: string): Promise<PartProduct | null> {
  try {
    const { data } = await api.get<{ data: PartProduct }>(`/api/parts/catalog/${encodeURIComponent(slug)}`);
    return data.data ? mapApiPart(data.data) : null;
  } catch {
    return null;
  }
}

export async function fetchPartReviews(slug: string): Promise<PartReview[]> {
  try {
    const { data } = await api.get<{ data: PartReview[] }>(`/api/parts/catalog/${encodeURIComponent(slug)}/reviews`);
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function postPartReview(slug: string, rating: number, title: string, content: string): Promise<ApiResult> {
  return mutate(() => api.post(`/api/parts/catalog/${encodeURIComponent(slug)}/reviews`, { rating, title, content }));
}

export type CheckoutShipping = {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pin: string;
};

export async function submitPartOrder(payload: {
  items: { part_id: string; qty: number }[];
  payment_method: "cod" | "whatsapp";
  shipping: CheckoutShipping;
  gstin?: string;
}): Promise<{ ok: true; order: PartOrder } | { ok: false; error: string; status?: number }> {
  try {
    const { data } = await api.post<{ data: PartOrder }>("/api/parts/checkout", {
      items: payload.items.map((i) => ({ partId: i.part_id, qty: i.qty })),
      paymentMethod: payload.payment_method,
      shipping: payload.shipping,
      gstin: payload.gstin || undefined,
    });
    return { ok: true, order: data.data };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e), status: axios.isAxiosError(e) ? e.response?.status : undefined };
  }
}

export async function fetchPartOrderById(_userId: string, orderId: string): Promise<PartOrder | null> {
  try {
    const { data } = await api.get<{ data: PartOrder }>(`/api/parts/my-orders/${encodeURIComponent(orderId)}`);
    return data.data ?? null;
  } catch (e) {
    if (isStatus(e, 401, 403, 404)) return null;
    throw e;
  }
}

export async function fetchMyPartOrders(_userId?: string): Promise<PartOrder[]> {
  try {
    const { data } = await api.get<{ data: PartOrder[] }>("/api/parts/my-orders");
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function cancelPartOrder(orderId: string, reason?: string): Promise<{ order: PartOrder | null; error: string | null }> {
  try {
    const { data } = await api.patch<{ data: PartOrder }>(`/api/parts/my-orders/${encodeURIComponent(orderId)}`, {
      action: "cancel",
      reason,
    });
    return { order: data.data, error: null };
  } catch (e) {
    return { order: null, error: apiErrorMessage(e) };
  }
}

export async function fetchSellerPartOrders(): Promise<PartOrder[]> {
  try {
    const { data } = await api.get<{ data: PartOrder[] }>("/api/parts/seller/orders");
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function updatePartOrderTracking(orderId: string, tracking: string, carrier: string): Promise<ApiResult> {
  return mutate(() =>
    api.patch(`/api/parts/seller/orders/${encodeURIComponent(orderId)}`, {
      status: "shipped",
      trackingNumber: tracking,
      carrier,
    })
  );
}

export async function updatePartOrderStatus(orderId: string, status: PartOrder["status"], note?: string): Promise<ApiResult> {
  return mutate(() => api.patch(`/api/parts/seller/orders/${encodeURIComponent(orderId)}`, { status, note }));
}

export type PartListingInput = {
  name: string;
  category: PartCategorySlug;
  brand?: string;
  price: number;
  mrp?: number;
  stock: number;
  images?: string[];
  compatibility?: string[];
  description?: string;
  sku?: string;
  hsnCode?: string;
  gstRate?: number;
  wholesalePrice?: number;
  bulkMinQty?: number;
  partOrigin?: PartOrigin;
  vehicleHubs?: HubCategorySlug[];
  asPartsDesk?: boolean;
};

export async function insertPart(payload: PartListingInput): Promise<ApiResult & { part?: PartProduct }> {
  try {
    const { data } = await api.post<{ data: PartProduct }>("/api/parts/seller/listings", payload);
    return { error: null, part: mapApiPart(data.data) };
  } catch (e) {
    return { error: { message: apiErrorMessage(e) } };
  }
}

export async function updatePartStock(partId: string, stock: number): Promise<ApiResult> {
  return mutate(() => api.patch(`/api/parts/seller/listings/${encodeURIComponent(partId)}`, { stock }));
}

export async function updatePartPricing(
  partId: string,
  patch: { price?: number; wholesale_price?: number; stock?: number; part_origin?: PartOrigin; isActive?: boolean }
): Promise<ApiResult> {
  return mutate(() =>
    api.patch(`/api/parts/seller/listings/${encodeURIComponent(partId)}`, {
      price: patch.price,
      wholesalePrice: patch.wholesale_price,
      stock: patch.stock,
      partOrigin: patch.part_origin,
      isActive: patch.isActive,
    })
  );
}

export async function fetchSellerParts(_sellerId?: string): Promise<PartProduct[]> {
  try {
    const { data } = await api.get<{ data: PartProduct[] }>("/api/parts/seller/listings");
    return (data.data ?? []).map(mapApiPart);
  } catch {
    return [];
  }
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

export function orderLineLabel(item: PartOrderItem): string {
  return item.partName ?? `Part ${item.partId.slice(0, 8)}`;
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
