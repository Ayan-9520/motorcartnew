import { apiFetch } from "./client";

export type NewCarStockItem = {
  id: string;
  brand: string;
  model: string;
  variant?: string | null;
  year?: number | null;
  fuel_type?: string | null;
  transmission?: string | null;
  price?: number | null;
  ex_showroom_price?: number | null;
  stock?: number | null;
  stock_status?: string | null;
  image_url?: string | null;
  images?: string[];
};

export type NewCarInventoryKpis = {
  totalRows: number;
  available: number;
  outOfStock: number;
  lowStock: number;
};

export type NewCarInventoryResult = {
  total: number;
  dealerId?: string;
  kpis: NewCarInventoryKpis;
  items: NewCarStockItem[];
};

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapRow(r: Record<string, unknown>): NewCarStockItem {
  const meta = (r.metadata && typeof r.metadata === "object" ? r.metadata : {}) as Record<string, unknown>;
  const imgs = Array.isArray(r.images)
    ? (r.images as unknown[]).map((u) => String(u ?? "").trim()).filter(Boolean)
    : Array.isArray(meta.images)
      ? (meta.images as unknown[]).map((u) => String(u ?? "").trim()).filter(Boolean)
      : [];
  const primary = String(r.image_url ?? r.imageUrl ?? imgs[0] ?? "").trim() || null;
  return {
    id: String(r.id),
    brand: String(r.brand ?? ""),
    model: String(r.model ?? ""),
    variant: r.variant != null ? String(r.variant) : null,
    year: num(r.year),
    fuel_type: r.fuel_type != null ? String(r.fuel_type) : r.fuelType != null ? String(r.fuelType) : null,
    transmission: r.transmission != null ? String(r.transmission) : null,
    price: num(r.price ?? r.on_road_price ?? r.onRoadPrice),
    ex_showroom_price: num(r.ex_showroom_price ?? r.exShowroomPrice),
    stock: num(r.stock) ?? 0,
    stock_status: r.stock_status != null ? String(r.stock_status) : r.stockStatus != null ? String(r.stockStatus) : null,
    image_url: primary,
    images: primary ? [primary, ...imgs.filter((u) => u !== primary)] : imgs,
  };
}

function emptyResult(): NewCarInventoryResult {
  return {
    total: 0,
    kpis: { totalRows: 0, available: 0, outOfStock: 0, lowStock: 0 },
    items: [],
  };
}

/** Dealer JWT — same `/api/new-car/inventory` as website New Car OS. */
export async function fetchNewCarInventory(opts?: {
  q?: string;
  pageSize?: number;
  page?: number;
}): Promise<NewCarInventoryResult> {
  const params = new URLSearchParams();
  params.set("pageSize", String(Math.min(500, Math.max(1, opts?.pageSize ?? 120))));
  params.set("page", String(Math.max(1, opts?.page ?? 1)));
  if (opts?.q?.trim()) params.set("q", opts.q.trim());

  const raw = await apiFetch<Record<string, unknown>>(`/api/new-car/inventory?${params.toString()}`, {
    auth: true,
  });

  const body =
    raw.data && typeof raw.data === "object" && !Array.isArray(raw.data) && Array.isArray((raw.data as Record<string, unknown>).data)
      ? (raw.data as Record<string, unknown>)
      : raw;

  const rows = Array.isArray(body.data) ? (body.data as Record<string, unknown>[]) : [];
  const kpisRaw = (body.kpis && typeof body.kpis === "object" ? body.kpis : {}) as Record<string, unknown>;
  const total = num(body.total) ?? rows.length;

  return {
    total,
    dealerId: body.dealerId != null ? String(body.dealerId) : undefined,
    kpis: {
      totalRows: num(kpisRaw.totalRows) ?? total,
      available: num(kpisRaw.available) ?? 0,
      outOfStock: num(kpisRaw.outOfStock) ?? 0,
      lowStock: num(kpisRaw.lowStock) ?? 0,
    },
    items: rows.map(mapRow),
  };
}

/** Soft wrapper — never throws; use for Home KPIs so a 403 doesn't blank the desk. */
export async function fetchNewCarInventorySafe(opts?: {
  q?: string;
  pageSize?: number;
}): Promise<NewCarInventoryResult | null> {
  try {
    return await fetchNewCarInventory(opts);
  } catch {
    return null;
  }
}

export function emptyNewCarInventory(): NewCarInventoryResult {
  return emptyResult();
}
