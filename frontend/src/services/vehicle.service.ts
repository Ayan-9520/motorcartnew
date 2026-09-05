import { featureFlags } from "@/config/feature-flags";
import { realDataOnly } from "@/config/real-data";
import { MOCK_VEHICLES } from "@/data/vehicle-catalog";
import { api } from "@/lib/api/axios";
import { hasConfiguredApi } from "@/lib/api/base-url";
import { withApiTimeout } from "@/lib/api/with-timeout";
import { supabase } from "@/integrations/supabase/client";
import type { DbVehicle, DbDealer } from "@/types/database";
import type { VehicleListing, VehicleFilters } from "@/types/vehicle";
import { filterVehicles, sortVehicles, paginateVehicles, slugify } from "@/lib/vehicle-utils";
import type { VehicleSortOption } from "@/types/vehicle";
import { resolveSaleMode } from "@/lib/sale-mode";
import { isBlockedImageUrl } from "@/lib/media/vehicle-media-registry";

type VehicleMetaExtras = VehicleListing["metadata"] & {
  dealerName?: string;
  dealerSlug?: string;
  dealerPhone?: string;
  dealerRating?: number;
  dealerVerified?: boolean;
};

export function normalizeFuelType(fuel: string): string {
  const key = fuel.trim().toLowerCase();
  if (!key) return "";
  const map: Record<string, string> = {
    petrol: "petrol",
    diesel: "diesel",
    electric: "electric",
    ev: "electric",
    cng: "cng",
    hybrid: "hybrid",
  };
  return map[key] ?? key;
}

export function normalizeTransmissionType(transmission: string): string {
  const key = transmission.trim().toLowerCase();
  if (!key) return "";
  if (key === "manual") return "manual";
  if (key.includes("auto") || key === "cvt" || key === "amt" || key === "dct") return "automatic";
  return key;
}

export function mapDbToListing(v: DbVehicle, dealer?: DbDealer | null): VehicleListing {
  const meta = (v.metadata ?? {}) as VehicleMetaExtras;
  const category = (v.category as VehicleListing["category"]) || "used-cars";
  const rawImages = Array.isArray(v.images) ? (v.images as unknown[]).map((u) => String(u ?? "").trim()) : [];
  // Only keep real URLs — never invent stock/Pexels gallery for empty listings.
  const images = rawImages
    .filter((u) => (u.startsWith("http://") || u.startsWith("https://") || u.includes("/uploads/") || u.startsWith("/media/")) && !isBlockedImageUrl(u))
    .slice(0, 8);
  return {
    id: v.id,
    slug: v.slug,
    title: v.title,
    brand: v.brand,
    model: v.model,
    variant: v.variant ?? undefined,
    year: v.year,
    price: Number(v.price),
    originalPrice: v.original_price ? Number(v.original_price) : undefined,
    fuelType: v.fuel_type,
    transmission: v.transmission,
    bodyType: v.body_type,
    category,
    kmsDriven: v.kms_driven,
    owners: v.owners,
    color: v.color ?? undefined,
    city: v.city,
    state: v.state,
    location: v.location ?? `${v.city}, ${v.state}`,
    images,
    features: v.features ?? [],
    description: v.description ?? undefined,
    isCertified: v.is_certified,
    isFeatured: v.is_featured,
    condition: v.condition as "new" | "used",
    status: v.status,
    aiPriceScore: v.ai_price_score ?? undefined,
    dealerId: v.dealer_id ?? undefined,
    dealerName: dealer?.name ?? meta.dealerName ?? (v.dealer_id ? "Motorcart Dealer" : ""),
    dealerSlug: dealer?.slug ?? meta.dealerSlug,
    dealerPhone: dealer?.phone ?? meta.dealerPhone,
    dealerRating: dealer ? Number(dealer.rating) : meta.dealerRating,
    dealerVerified: dealer?.is_verified ?? meta.dealerVerified,
    saleMode: resolveSaleMode(v.sale_mode, meta as Record<string, unknown>),
    metadata: meta,
    createdAt: v.created_at,
  };
}

/** DB vehicles only — no mock catalog merge. */
export async function getVehiclePool(): Promise<VehicleListing[]> {
  return fetchVehiclesFromDb(500);
}

export async function fetchVehiclesFromDb(limit = 500): Promise<VehicleListing[]> {
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data?.length) return [];

    return (data as DbVehicle[]).map((vehicle) => mapDbToListing(vehicle, null));
  } catch {
    return [];
  }
}

/**
 * Resolve wishlist/compare IDs to listings (vehicles table + new-car stock).
 * Preserves caller id order; skips IDs that cannot be resolved.
 */
export async function fetchVehiclesByIds(ids: string[]): Promise<VehicleListing[]> {
  const unique = [...new Set(ids.map((id) => String(id ?? "").trim()).filter(Boolean))];
  if (!unique.length) return [];

  const byKey = new Map<string, VehicleListing>();

  try {
    const { data, error } = await supabase.from("vehicles").select("*").in("id", unique);
    if (!error && data?.length) {
      for (const row of data as DbVehicle[]) {
        const listing = mapDbToListing(row, null);
        byKey.set(listing.id, listing);
      }
    }
  } catch {
    /* fall through */
  }

  const stillMissing = unique.filter((id) => !byKey.has(id));
  if (stillMissing.length && hasConfiguredApi()) {
    const { fetchNewCarBySlug } = await import("@/features/new-cars/services/new-cars.service");
    await Promise.all(
      stillMissing.map(async (id) => {
        const slug = /^ncd-/i.test(id) ? id : `ncd-${id}`;
        try {
          const listing = await fetchNewCarBySlug(slug);
          if (!listing) return;
          byKey.set(id, listing);
          if (listing.id !== id) byKey.set(listing.id, listing);
        } catch {
          /* skip */
        }
      }),
    );
  }

  if (!realDataOnly) {
    for (const id of unique) {
      if (byKey.has(id)) continue;
      const mock = MOCK_VEHICLES.find((v) => v.id === id || v.slug === id);
      if (mock) byKey.set(id, mock);
    }
  }

  const ordered: VehicleListing[] = [];
  const seen = new Set<string>();
  for (const id of unique) {
    const hit = byKey.get(id);
    if (!hit || seen.has(hit.id)) continue;
    seen.add(hit.id);
    ordered.push(hit);
  }
  return ordered;
}

export async function fetchVehicleBySlug(slug: string): Promise<VehicleListing | null> {
  // New-car inventory public listings use ncd-{uuid} (full id) or legacy short prefix
  if (/^ncd-/i.test(slug) && hasConfiguredApi()) {
    try {
      const { fetchNewCarBySlug } = await import("@/features/new-cars/services/new-cars.service");
      const full = await fetchNewCarBySlug(slug);
      if (full) return full;

      // Legacy short slug ncd-XXXXXXXX — resolve via stock list
      if (/^ncd-[0-9a-f-]{8}$/i.test(slug)) {
        const { data } = await api.get<{ data?: Record<string, unknown>[] }>("/api/new-car/stock", {
          params: { limit: 60 },
        });
        const prefix = slug.slice(4).toLowerCase();
        const match = (data?.data ?? []).find((r) => String(r.id ?? "").toLowerCase().startsWith(prefix));
        if (match?.id) return fetchNewCarBySlug(String(match.id));
      }
    } catch {
      /* fall through */
    }
  }

  if (featureFlags.unifiedVehicleApi && hasConfiguredApi()) {
    try {
      const { data } = await withApiTimeout(
        api.get<{
          vehicle: DbVehicle;
          dealer: DbDealer | null;
        }>(`/api/vehicles/slug/${encodeURIComponent(slug)}`, { timeout: 5000 }),
        5000
      );
      if (data?.vehicle) {
        return mapDbToListing(data.vehicle, data.dealer ?? null);
      }
    } catch {
      /* fall through to legacy */
    }
  }

  try {
    const { data, error } = await supabase.from("vehicles").select("*").eq("slug", slug).maybeSingle();

    if (!error && data) {
      return mapDbToListing(data as DbVehicle, null);
    }
  } catch {
    /* fall through */
  }

  if (realDataOnly) return null;
  return MOCK_VEHICLES.find((v) => v.slug === slug) ?? null;
}

export async function searchVehicles(options: {
  filters: VehicleFilters;
  sort: VehicleSortOption;
  page: number;
  pageSize: number;
}): Promise<{ vehicles: VehicleListing[]; total: number; page: number; totalPages: number }> {
  const pool = await getVehiclePool();
  const filtered = filterVehicles(pool, options.filters);
  const sorted = sortVehicles(filtered, options.sort);
  const { items, total, page, totalPages } = paginateVehicles(sorted, options.page, options.pageSize);

  return { vehicles: items, total, page, totalPages };
}

export { submitVehicleEnquiry, submitTestDrive } from "@/services/leads.service";

export type VehicleFormData = {
  title: string;
  brand: string;
  model: string;
  variant?: string;
  year: number;
  price: number;
  originalPrice?: number;
  fuelType: string;
  transmission: string;
  bodyType: string;
  category: string;
  kmsDriven: number;
  owners: number;
  color?: string;
  city: string;
  state: string;
  description?: string;
  features?: string[];
  images?: string[];
  condition: "new" | "used";
  saleMode?: VehicleListing["saleMode"];
  metadata?: VehicleListing["metadata"];
};

function resolveStoredVehicleImages(data: Pick<VehicleFormData, "images">) {
  // Keep dealer-uploaded URLs: https(s), /uploads/, /media/ — never invent stock photos.
  // Local paths like ./photo.jpg are still rejected.
  return (data.images ?? [])
    .map((u) => String(u ?? "").trim())
    .filter((u) => {
      if (!u || isBlockedImageUrl(u)) return false;
      if (/^https?:\/\//i.test(u)) return true;
      if (u.startsWith("/uploads/") || u.startsWith("/media/")) return true;
      if (u.includes("/uploads/") || u.includes("/media/")) return true;
      return false;
    })
    .slice(0, 8);
}

export async function createVehicle(data: VehicleFormData, sellerId: string, dealerId?: string) {
  const slug = slugify(`${data.year}-${data.brand}-${data.model}-${data.city}-${Date.now()}`);
  const images = resolveStoredVehicleImages(data);
  const isNew = data.condition === "new" || data.category === "new-cars";
  return supabase.from("vehicles").insert({
    slug,
    title: data.title,
    brand: data.brand,
    model: data.model,
    variant: data.variant,
    year: data.year,
    price: data.price,
    original_price: data.originalPrice,
    fuel_type: normalizeFuelType(data.fuelType),
    transmission: normalizeTransmissionType(data.transmission),
    body_type: data.bodyType,
    category: isNew ? "new-cars" : data.category,
    kms_driven: isNew ? 0 : data.kmsDriven,
    owners: isNew ? 0 : data.owners,
    color: data.color,
    city: data.city,
    state: data.state,
    description: data.description,
    features: data.features ?? [],
    images,
    condition: isNew ? "new" : data.condition,
    seller_id: sellerId,
    dealer_id: dealerId,
    sale_mode: data.saleMode ?? "dealer_offer",
    metadata: data.metadata ?? {},
    status: "available",
  }).select().single();
}

export async function updateVehicle(id: string, data: Partial<VehicleFormData> & { status?: string; is_featured?: boolean }) {
  const payload: Record<string, unknown> = {};
  if (data.title != null) payload.title = data.title;
  if (data.brand != null) payload.brand = data.brand;
  if (data.model != null) payload.model = data.model;
  if (data.variant != null) payload.variant = data.variant;
  if (data.year != null) payload.year = data.year;
  if (data.price != null) payload.price = data.price;
  if (data.color != null) payload.color = data.color;
  if (data.city != null) payload.city = data.city;
  if (data.state != null) payload.state = data.state;
  if (data.description != null) payload.description = data.description;
  if (data.condition != null) payload.condition = data.condition;
  if (data.category != null) payload.category = data.category;
  if (data.features != null) payload.features = data.features;
  if (data.metadata != null) payload.metadata = data.metadata;
  if (data.saleMode != null) payload.sale_mode = data.saleMode;
  if (data.status != null) payload.status = data.status;
  if (data.is_featured != null) payload.is_featured = data.is_featured;
  if (data.fuelType) payload.fuel_type = normalizeFuelType(data.fuelType);
  if (data.transmission) payload.transmission = normalizeTransmissionType(data.transmission);
  if (data.bodyType) payload.body_type = data.bodyType;
  if (data.kmsDriven != null) payload.kms_driven = data.kmsDriven;
  if (data.owners != null) payload.owners = data.owners;
  if (data.originalPrice != null) payload.original_price = data.originalPrice;
  if (data.images !== undefined) {
    payload.images = resolveStoredVehicleImages({ images: data.images });
  }
  const result = await supabase.from("vehicles").update(payload).eq("id", id).select().single();
  if (!result.error && hasConfiguredApi()) {
    // Keep New Cars public grid in sync when this vehicle has linked NCD rows
    try {
      const images = (payload.images as string[] | undefined) ?? data.images;
      await api.patch(`/api/new-car/inventory/by-vehicle/${encodeURIComponent(id)}`, {
        brand: data.brand,
        model: data.model,
        variant: data.variant,
        fuel_type: data.fuelType,
        transmission: data.transmission,
        price: data.price,
        images,
        image_url: Array.isArray(images) && images[0] ? images[0] : images === undefined ? undefined : null,
        condition: data.condition,
        category: data.category,
      });
    } catch {
      /* best-effort dual-write */
    }
  }
  return result;
}

export async function deleteVehicle(id: string, opts?: { cascadeInventory?: boolean }) {
  // Soft-delete via DB layer (deleted_at) — dealers are allowlisted for vehicles DELETE.
  const result = await supabase.from("vehicles").delete().eq("id", id);
  if (result.error) return result;

  if (opts?.cascadeInventory === false) return result;

  // Also remove / archive linked NewCarInventory so New Cars public page updates.
  if (hasConfiguredApi()) {
    try {
      await api.delete(`/api/new-car/inventory/by-vehicle/${encodeURIComponent(id)}`);
    } catch {
      /* vehicle already soft-deleted; inventory cleanup is best-effort */
    }
  }
  return result;
}

export async function fetchDealerVehicles(sellerId: string) {
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .or(`seller_id.eq.${sellerId}`)
    .order("created_at", { ascending: false });
  return ((data ?? []) as DbVehicle[]).map((v) => mapDbToListing(v));
}
