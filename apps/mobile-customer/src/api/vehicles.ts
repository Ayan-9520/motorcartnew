import { apiFetch } from "./client";

export type Vehicle = {
  id: string;
  slug?: string;
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  city?: string;
  category?: string;
  fuel_type?: string;
  transmission?: string;
  km_driven?: number;
  owners?: number;
  description?: string;
  images?: string[];
  status?: string;
  sale_mode?: string;
  dealer_id?: string | null;
  dealer_slug?: string | null;
  dealer_name?: string | null;
};

export type VehicleQuery = {
  limit?: number;
  category?: string;
  brand?: string;
  city?: string;
  q?: string;
};

function unwrapVehicles(res: { data?: Vehicle[] } | Vehicle[]): Vehicle[] {
  if (Array.isArray(res)) return res;
  return res.data ?? [];
}

export async function fetchVehicles(limitOrQuery: number | VehicleQuery = 24): Promise<Vehicle[]> {
  const q: VehicleQuery = typeof limitOrQuery === "number" ? { limit: limitOrQuery } : limitOrQuery;
  const params = new URLSearchParams();
  params.set("limit", String(q.limit ?? 40));
  if (q.category) params.set("category", q.category);
  if (q.brand) params.set("brand", q.brand);
  if (q.city) params.set("city", q.city);
  const res = await apiFetch<{ data?: Vehicle[] } | Vehicle[]>(`/api/vehicles?${params.toString()}`, {
    auth: false,
  });
  let list = unwrapVehicles(res);
  if (q.q?.trim()) {
    const needle = q.q.trim().toLowerCase();
    list = list.filter((v) => {
      const hay = [v.title, v.brand, v.model, v.city, v.category, v.fuel_type, v.dealer_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }
  return list;
}

export async function fetchVehicleById(id: string): Promise<Vehicle | null> {
  try {
    const res = await apiFetch<{ data?: Vehicle } | Vehicle>(`/api/vehicles/${encodeURIComponent(id)}`, {
      auth: false,
    });
    if (res && typeof res === "object" && "data" in res && (res as { data?: Vehicle }).data) {
      return (res as { data: Vehicle }).data;
    }
    if (res && typeof res === "object" && "id" in res) return res as Vehicle;
    return null;
  } catch {
    return null;
  }
}
