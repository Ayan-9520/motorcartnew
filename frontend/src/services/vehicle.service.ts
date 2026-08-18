import { supabase } from "@/integrations/supabase/client";
import type { DbVehicle, DbDealer } from "@/types/database";
import type { VehicleListing, VehicleFilters } from "@/types/vehicle";
import { MOCK_VEHICLES } from "@/data/vehicle-catalog";
import { realDataOnly } from "@/config/real-data";
import { filterVehicles, sortVehicles, paginateVehicles, slugify } from "@/lib/vehicle-utils";
import type { VehicleSortOption } from "@/types/vehicle";
import { resolveVehicleGallery } from "@/lib/media/resolve-images";
import { resolveSaleMode } from "@/lib/sale-mode";
import { featureFlags } from "@/config/feature-flags";
import { api } from "@/lib/api/axios";
import { hasConfiguredApi } from "@/lib/api/base-url";
import { withApiTimeout } from "@/lib/api/with-timeout";

type VehicleMetaExtras = VehicleListing["metadata"] & {
  dealerName?: string;
  dealerSlug?: string;
  dealerPhone?: string;
  dealerRating?: number;
  dealerVerified?: boolean;
};

export function normalizeFuelType(fuel: string): string {
  const key = fuel.trim().toLowerCase();
  const map: Record<string, string> = {
    petrol: "petrol",
    diesel: "diesel",
    electric: "electric",
    ev: "electric",
    cng: "cng",
    hybrid: "hybrid",
  };
  return map[key] ?? "petrol";
}

export function normalizeTransmissionType(transmission: string): string {
  const key = transmission.trim().toLowerCase();
  if (key === "manual") return "manual";
  return "automatic";
}

export function mapDbToListing(v: DbVehicle, dealer?: DbDealer | null): VehicleListing {
  const meta = (v.metadata ?? {}) as VehicleMetaExtras;
  const category = (v.category as VehicleListing["category"]) || "used-cars";
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
    images: resolveVehicleGallery(v.brand, v.model, v.body_type, v.images, 0, {
      category,
      fuelType: v.fuel_type,
    }),
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

export async function fetchVehicleBySlug(slug: string): Promise<VehicleListing | null> {
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

function resolveStoredVehicleImages(data: Pick<VehicleFormData, "brand" | "model" | "bodyType" | "category" | "fuelType" | "images">) {
  return resolveVehicleGallery(data.brand, data.model, data.bodyType, data.images ?? [], 0, {
    category: data.category,
    fuelType: data.fuelType,
  });
}

export async function createVehicle(data: VehicleFormData, sellerId: string, dealerId?: string) {
  const slug = slugify(`${data.year}-${data.brand}-${data.model}-${data.city}-${Date.now()}`);
  const images = resolveStoredVehicleImages(data);
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
    category: data.category,
    kms_driven: data.kmsDriven,
    owners: data.owners,
    color: data.color,
    city: data.city,
    state: data.state,
    description: data.description,
    features: data.features ?? [],
    images,
    condition: data.condition,
    seller_id: sellerId,
    dealer_id: dealerId,
    sale_mode: data.saleMode ?? "dealer_offer",
    metadata: data.metadata ?? {},
    status: "available",
  }).select().single();
}

export async function updateVehicle(id: string, data: Partial<VehicleFormData> & { status?: string; is_featured?: boolean }) {
  const payload: Record<string, unknown> = { ...data };
  if (data.fuelType) payload.fuel_type = normalizeFuelType(data.fuelType);
  if (data.transmission) payload.transmission = normalizeTransmissionType(data.transmission);
  if (data.bodyType) payload.body_type = data.bodyType;
  if (data.kmsDriven != null) payload.kms_driven = data.kmsDriven;
  if (data.originalPrice != null) payload.original_price = data.originalPrice;
  if (data.images) {
    payload.images = resolveVehicleGallery(
      data.brand ?? "",
      data.model ?? "",
      data.bodyType ?? "",
      data.images,
      0,
      { category: data.category, fuelType: data.fuelType }
    );
  }
  delete payload.fuelType;
  delete payload.bodyType;
  delete payload.kmsDriven;
  delete payload.originalPrice;
  return supabase.from("vehicles").update(payload).eq("id", id).select().single();
}

export async function deleteVehicle(id: string) {
  return supabase.from("vehicles").delete().eq("id", id);
}

export async function fetchDealerVehicles(sellerId: string) {
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .or(`seller_id.eq.${sellerId}`)
    .order("created_at", { ascending: false });
  return ((data ?? []) as DbVehicle[]).map((v) => mapDbToListing(v));
}
