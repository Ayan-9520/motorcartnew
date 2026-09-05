import { supabase } from "@/shared/api/client";
import { api } from "@/lib/api/axios";
import { hasConfiguredApi } from "@/lib/api/base-url";
import { featureFlags } from "@/config/feature-flags";
import { realDataOnly } from "@/config/real-data";
import { getVehicleHero } from "@/lib/media/vehicle-media-registry";
import { resolveVehicleHero } from "@/lib/media/resolve-images";
import { buildMockNewCarDealerSnapshot } from "../data/mock-ncd-data";
import type { NewCarDealerSnapshot, NcdInventoryItem, NcdLead, NcdLeadDetail, NcdLeadStage } from "../types";
import type { DbVehicle } from "@/types/database";
import { syncNewCarToMarketplace, updateMarketplaceVehicle, deleteVehicle } from "../lib/marketplace-sync";

function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const m = (err.message ?? "").toLowerCase();
  return err.code === "42P01" || err.code === "PGRST205" || m.includes("does not exist") || m.includes("unknown table");
}

const HOT_STAGES = new Set<NcdLeadStage>(["new", "interested", "test_drive", "contacted"]);

function mapLeadStatusToStage(status: string, meta?: Record<string, unknown>): NcdLeadStage {
  const fromMeta = meta?.stage;
  if (typeof fromMeta === "string") return fromMeta as NcdLeadStage;
  const s = status.toLowerCase();
  if (s === "qualified") return "interested";
  if (s === "converted") return "delivered";
  if (s === "contacted") return "contacted";
  if (s === "lost") return "lost";
  return "new";
}

function mapVehicleToNcdItem(v: DbVehicle, fallbackImage: string): NcdInventoryItem {
  const imgs = Array.isArray(v.images) ? v.images : [];
  const meta = (v.metadata ?? {}) as Record<string, unknown>;
  const ex = v.original_price != null ? Number(v.original_price) : Number(v.price);
  const onRoad = Number(v.price);
  const imageUrl = resolveVehicleHero(v.brand, v.model, v.body_type ?? "SUV", imgs, 0, {
    category: v.category,
    fuelType: v.fuel_type,
  });
  return {
    id: String(v.id),
    vehicleId: String(v.id),
    inventorySource: "vehicle",
    brand: v.brand,
    model: v.model,
    variant: v.variant ?? "Standard",
    fuelType: v.fuel_type,
    transmission: v.transmission,
    exShowroomPrice: ex,
    onRoadPrice: onRoad,
    discountAmount: Math.max(0, ex - onRoad),
    stockStatus: v.status === "available" ? "available" : "booked",
    stockHealth: "fast_moving",
    colors: v.color ? [v.color] : ["White"],
    expectedDeliveryDays: 14,
    imageUrl: imageUrl || fallbackImage,
    ncdInventoryId: typeof meta.ncd_inventory_id === "string" ? meta.ncd_inventory_id : undefined,
  };
}

function mapInventoryRow(r: Record<string, unknown>, fallbackImage: string): NcdInventoryItem {
  const meta = (r.metadata && typeof r.metadata === "object" ? r.metadata : {}) as Record<string, unknown>;
  const brand = String(r.brand ?? meta.brand ?? "Brand");
  const model = String(r.model ?? meta.model ?? "Model");
  const ex = Number(r.ex_showroom_price ?? r.price ?? meta.exShowroomPrice ?? 0);
  const onRoad = Number(r.on_road_price ?? r.price ?? ex);
  return {
    id: String(r.id),
    ncdInventoryId: String(r.id),
    vehicleId: typeof meta.vehicle_id === "string" ? meta.vehicle_id : undefined,
    inventorySource: "ncd",
    brand,
    model,
    variant: String(r.variant ?? meta.variant ?? ""),
    fuelType: String(r.fuel_type ?? meta.fuelType ?? "Petrol"),
    transmission: String(r.transmission ?? meta.transmission ?? "Manual"),
    exShowroomPrice: ex,
    onRoadPrice: onRoad > 0 ? onRoad : 0,
    discountAmount: Number(r.discount_amount ?? meta.discountAmount ?? 0),
    stockStatus: (r.stock_status ?? meta.stockStatus ?? "available") as NcdInventoryItem["stockStatus"],
    stockHealth: (r.stock_health ?? meta.stockHealth ?? "fast_moving") as NcdInventoryItem["stockHealth"],
    colors: Array.isArray(r.colors) ? (r.colors as string[]) : ["White"],
    expectedDeliveryDays: (r.expected_delivery_days as number | undefined) ?? undefined,
    waitingPeriodDays: (r.waiting_period_days as number | undefined) ?? undefined,
    brochureUrl: (r.brochure_url as string | undefined) ?? undefined,
    offers: Array.isArray(r.offers) ? (r.offers as NcdInventoryItem["offers"]) : [],
    imageUrl: resolveVehicleHero(brand, model, String(r.body_type ?? meta.bodyType ?? "SUV"), 
      typeof r.image_url === "string" ? [String(r.image_url)] : [],
      0,
      { category: String(r.category ?? meta.category ?? "new-cars"), fuelType: String(r.fuel_type ?? meta.fuelType ?? "Petrol") }
    ) || fallbackImage,
  };
}

function mapLeadRow(r: Record<string, unknown>): NcdLead {
  const meta = (r.metadata && typeof r.metadata === "object" ? r.metadata : {}) as Record<string, unknown>;
  const vehicleInterest = String(r.vehicle_interest ?? meta.vehicle_title ?? "");
  const preferredModel =
    (r.preferred_model as string | undefined) ??
    (vehicleInterest ? vehicleInterest.split(" ").slice(1).join(" ") : undefined);
  return {
    id: String(r.id),
    customerName: String(r.customer_name ?? r.name ?? meta.customerName ?? "Customer"),
    phone: String(r.phone ?? ""),
    email: (r.email as string | undefined) ?? undefined,
    city: String(r.city ?? meta.city ?? ""),
    source: String(r.source ?? "website"),
    stage: mapLeadStatusToStage(String(r.stage ?? r.status ?? "new"), meta),
    preferredBrand: (r.preferred_brand as string | undefined) ?? undefined,
    preferredModel,
    budgetMax: r.budget_max != null ? Number(r.budget_max) : undefined,
    tradeIn: (r.trade_in_vehicle as string | undefined) ?? undefined,
    financeInterest: Boolean(r.finance_interest ?? meta.finance_interest ?? false),
    insuranceInterest: Boolean(r.insurance_interest ?? meta.insurance_interest ?? false),
    assignedTo: r.assigned_to as string | undefined,
    score: Number(r.score ?? 50),
    createdAt: String(r.created_at ?? new Date().toISOString()),
  };
}

function mergeLeads(primary: NcdLead[], legacy: NcdLead[]): NcdLead[] {
  const seen = new Set(primary.map((l) => l.phone));
  const merged = [...primary];
  for (const l of legacy) {
    if (!seen.has(l.phone)) merged.push(l);
  }
  return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function buildRealSnapshot(
  inventory: NcdInventoryItem[],
  leads: NcdLead[],
  dealerName: string,
  kpis?: { totalRows?: number; available?: number; outOfStock?: number; lowStock?: number },
): NewCarDealerSnapshot {
  const hot = leads.filter((l) => HOT_STAGES.has(l.stage)).length;
  const delivered = leads.filter((l) => l.stage === "delivered").length;
  const bookings = leads.filter((l) => l.stage === "booking").length;
  const testDrives = leads.filter((l) => l.stage === "test_drive").length;
  const available = kpis?.available ?? inventory.filter((i) => i.stockStatus === "available").length;
  const out = kpis?.outOfStock ?? inventory.filter((i) => i.stockStatus === "out_of_stock").length;
  const low = kpis?.lowStock ?? 0;

  const sourceCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.source] = (acc[l.source] ?? 0) + 1;
    return acc;
  }, {});

  const insights =
    inventory.length === 0
      ? [
          {
            id: "empty-stock",
            title: "No inventory yet",
            summary: "Add a vehicle or upload Excel/CSV to populate showroom stock.",
            severity: "info" as const,
            actionLabel: "Bulk upload",
            actionUrl: "/dashboard/new-car/inventory/bulk",
          },
        ]
      : low > 0
        ? [
            {
              id: "low-stock",
              title: `${low} low-stock variant(s)`,
              summary: "Deterministic threshold — restock or update quantity.",
              severity: "warning" as const,
              actionLabel: "Open inventory",
              actionUrl: "/dashboard/new-car/inventory",
            },
          ]
        : hot > 0
          ? [
              {
                id: "hot-leads",
                title: `${hot} open leads need follow-up`,
                summary: "Real CRM leads assigned to your dealer workspace.",
                severity: "warning" as const,
                actionLabel: "Open CRM",
                actionUrl: "/dashboard/new-car/leads",
              },
            ]
          : [
              {
                id: "stock-ok",
                title: `${available} available variant(s)`,
                summary: "Stock counts come from NewCarInventory in PostgreSQL.",
                severity: "success" as const,
                actionLabel: "Public listing",
                actionUrl: "/buy/cars/new",
              },
            ];

  return {
    showroom: {
      id: "showroom",
      name: dealerName,
      brand: "",
      city: "",
      status: "live",
      monthlyTarget: 0,
      monthlyAchieved: delivered,
      carsSoldMtd: delivered,
    },
    metrics: [
      { key: "stock", label: "Inventory rows", value: kpis?.totalRows ?? inventory.length, href: "/dashboard/new-car/inventory" },
      { key: "available", label: "Available", value: available, href: "/dashboard/new-car/inventory" },
      { key: "out_of_stock", label: "Out of stock", value: out, href: "/dashboard/new-car/inventory" },
      { key: "low_stock", label: "Low stock", value: low, href: "/dashboard/new-car/inventory" },
      { key: "leads", label: "Open leads", value: leads.length, sublabel: `${hot} hot`, href: "/dashboard/new-car/leads" },
      { key: "test_drives", label: "Test drives", value: testDrives, href: "/dashboard/new-car/test-drives" },
      { key: "bookings", label: "Bookings", value: bookings, href: "/dashboard/new-car/bookings" },
      { key: "sold", label: "Delivered stage", value: delivered },
    ],
    hotLeadsCount: hot,
    inventory,
    leads,
    bookings: leads
      .filter((l) => l.stage === "booking")
      .map((l) => ({
        id: l.id,
        customerName: l.customerName,
        vehicleLabel: l.preferredModel ?? "TBD",
        tokenAmount: 0,
        bookingAmount: l.budgetMax ?? 0,
        status: "pending" as const,
        bookedAt: l.createdAt,
      })),
    deliveries: [],
    staff: [],
    insights,
    salesChart: [],
    leadSourceChart: Object.entries(sourceCounts).map(([source, count]) => ({ source, count })),
  };
}

function emptySnapshot(dealerName: string): NewCarDealerSnapshot {
  return buildRealSnapshot([], [], dealerName);
}

export async function fetchNewCarDealerSnapshot(
  dealerId?: string,
  dealerName?: string
): Promise<NewCarDealerSnapshot> {
  const name = dealerName ?? "Your showroom";
  if (!dealerId) {
    if (realDataOnly) return withRealTestDriveCount(emptySnapshot(name));
    return buildMockNewCarDealerSnapshot(name);
  }

  const fallbackImg = getVehicleHero({ brand: "Car", model: "Sedan", bodyType: "Sedan" });

  if (hasConfiguredApi()) {
    try {
      const { data } = await api.get<{
        data?: Record<string, unknown>[];
        kpis?: { totalRows?: number; available?: number; outOfStock?: number; lowStock?: number };
      }>("/api/new-car/inventory", { params: { dealer_id: dealerId, pageSize: 100 } });
      const rows = Array.isArray(data.data) ? data.data : [];
      const inventory = rows.map((r) => mapInventoryRow(r, fallbackImg));
      const [{ data: marketplaceLeads }, { data: legacyLeads }] = await Promise.all([
        supabase.from("leads").select("*").eq("dealer_id", dealerId).order("created_at", { ascending: false }).limit(100),
        supabase.from("dealer_leads").select("*").eq("dealer_id", dealerId).order("created_at", { ascending: false }).limit(100),
      ]);
      const leads = mergeLeads(
        (marketplaceLeads ?? []).map((r) => mapLeadRow(r as Record<string, unknown>)),
        (legacyLeads ?? []).map((r) => mapLeadRow(r as Record<string, unknown>))
      );
      return withRealTestDriveCount(buildRealSnapshot(inventory, leads, name, data.kpis));
    } catch {
      /* fall through to legacy path */
    }
  }

  const [{ data: inv, error: invErr }, { data: marketplaceLeads }, { data: legacyLeads }, { data: marketplaceVehicles, error: vehErr }] =
    await Promise.all([
      supabase.from("new_car_inventory").select("*").eq("dealer_id", dealerId).order("created_at", { ascending: false }).limit(100),
      supabase.from("leads").select("*").eq("dealer_id", dealerId).order("created_at", { ascending: false }).limit(100),
      supabase.from("dealer_leads").select("*").eq("dealer_id", dealerId).order("created_at", { ascending: false }).limit(100),
      supabase.from("vehicles").select("*").eq("dealer_id", dealerId).eq("category", "new-cars").neq("status", "sold").order("created_at", { ascending: false }).limit(100),
    ]);

  const hasInv = !isMissingTable(invErr) && (inv?.length ?? 0) > 0;
  const hasMarketplace = !isMissingTable(vehErr) && (marketplaceVehicles?.length ?? 0) > 0;
  const leads = mergeLeads(
    (marketplaceLeads ?? []).map((r) => mapLeadRow(r as Record<string, unknown>)),
    (legacyLeads ?? []).map((r) => mapLeadRow(r as Record<string, unknown>))
  );

  if (!hasInv && !hasMarketplace && leads.length === 0) {
    if (realDataOnly) return withRealTestDriveCount(emptySnapshot(name));
    return { ...buildMockNewCarDealerSnapshot(name), showroom: { ...buildMockNewCarDealerSnapshot(name).showroom, name } };
  }

  const inventory = hasInv
    ? (inv as Record<string, unknown>[]).map((r) => mapInventoryRow(r, fallbackImg))
    : hasMarketplace
      ? (marketplaceVehicles as DbVehicle[]).map((v) => mapVehicleToNcdItem(v, fallbackImg))
      : [];

  return withRealTestDriveCount(buildRealSnapshot(inventory, leads, name));
}

async function withRealTestDriveCount(snapshot: NewCarDealerSnapshot): Promise<NewCarDealerSnapshot> {
  if (!hasConfiguredApi()) return snapshot;
  try {
    const { data } = await api.get<{ data?: unknown[] }>("/api/test-drives");
    const count = Array.isArray(data.data) ? data.data.length : 0;
    return {
      ...snapshot,
      metrics: snapshot.metrics.map((m) =>
        m.key === "test_drives" ? { ...m, value: count } : m,
      ),
    };
  } catch {
    return {
      ...snapshot,
      metrics: snapshot.metrics.map((m) =>
        m.key === "test_drives" ? { ...m, value: 0 } : m,
      ),
    };
  }
}

export async function createNewCarInventory(
  dealerId: string,
  payload: {
    brand: string;
    model: string;
    variant: string;
    fuelType: string;
    transmission: string;
    exShowroomPrice: number;
    onRoadPrice?: number;
    stockStatus?: string;
    imageUrl?: string;
    images?: string[];
    waitingPeriodDays?: number;
    brochureUrl?: string;
    offers?: NcdInventoryItem["offers"];
    stock?: number;
    year?: number;
    bodyType?: string;
    engineCc?: string;
    mileage?: string;
    rangeKm?: string;
    batteryKwh?: string;
    power?: string;
    torque?: string;
    seating?: string;
    bootSpace?: string;
    groundClearance?: string;
    driveType?: string;
    airbags?: string;
    features?: string[];
    notes?: string;
  },
  options?: {
    sellerId?: string;
    dealerCity?: string;
    dealerState?: string;
    syncMarketplace?: boolean;
    linkedVehicleId?: string;
  }
) {
  const ex = payload.exShowroomPrice;
  // Never invent on-road (e.g. ex * 1.12) — only use dealer-provided value
  const onRoad =
    payload.onRoadPrice != null && Number(payload.onRoadPrice) > 0 ? Number(payload.onRoadPrice) : undefined;
  let vehicleId: string | undefined = options?.linkedVehicleId;

  if (options?.syncMarketplace && options.sellerId && options.dealerCity && options.dealerState) {
    const { data: veh, error: vehErr } = await syncNewCarToMarketplace(
      {
        brand: payload.brand,
        model: payload.model,
        variant: payload.variant,
        fuelType: payload.fuelType,
        transmission: payload.transmission,
        exShowroomPrice: ex,
        onRoadPrice: onRoad ?? ex,
        imageUrl: payload.imageUrl,
      },
      options.sellerId,
      { id: dealerId, city: options.dealerCity, state: options.dealerState }
    );
    if (vehErr) return { data: null, error: vehErr };
    vehicleId = (veh as { id?: string })?.id;
  }

  const row = {
    dealer_id: dealerId,
    brand: payload.brand.trim(),
    model: payload.model.trim(),
    variant: payload.variant.trim() || null,
    year: payload.year,
    fuel_type: payload.fuelType,
    transmission: payload.transmission,
    ex_showroom_price: ex,
    on_road_price: onRoad ?? null,
    price: ex > 0 ? ex : null,
    stock: payload.stock ?? 1,
    stock_status: payload.stockStatus ?? "available",
    stock_health: "fast_moving",
    colors: [],
    image_url: payload.imageUrl ?? payload.images?.[0] ?? null,
    expected_delivery_days: payload.waitingPeriodDays ?? null,
    waiting_period_days: payload.waitingPeriodDays,
    brochure_url: payload.brochureUrl ?? null,
    offers: payload.offers ?? [],
    body_type: payload.bodyType,
    engine_cc: payload.engineCc,
    mileage: payload.mileage,
    range_km: payload.rangeKm,
    battery_kwh: payload.batteryKwh,
    power: payload.power,
    torque: payload.torque,
    seating: payload.seating,
    boot_space: payload.bootSpace,
    ground_clearance: payload.groundClearance,
    drive_type: payload.driveType,
    airbags: payload.airbags,
    features: payload.features?.join("|"),
    notes: payload.notes,
    metadata: {
      ...(vehicleId ? { vehicle_id: vehicleId } : {}),
      ...(ex <= 0 ? { price_on_request: true } : {}),
      ...(payload.images?.length
        ? { images: payload.images.map((u) => String(u).trim()).filter(Boolean).slice(0, 8) }
        : payload.imageUrl
          ? { images: [payload.imageUrl] }
          : {}),
    },
  };

  if (hasConfiguredApi()) {
    try {
      const { data, status } = await api.post<{ data?: Record<string, unknown> }>("/api/new-car/inventory", row);
      if (status >= 200 && status < 300) return { data: data?.data, error: null };
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      return {
        data: null,
        error: { message: ax.response?.data?.message ?? ax.message ?? "Could not add vehicle" },
      };
    }
  }

  return supabase.from("new_car_inventory").insert(row);
}

export async function updateNewCarInventory(
  item: NcdInventoryItem,
  patch: {
    brand?: string;
    model?: string;
    variant?: string;
    fuelType?: string;
    transmission?: string;
    exShowroomPrice?: number;
    onRoadPrice?: number;
    stockStatus?: NcdInventoryItem["stockStatus"];
    imageUrl?: string;
    images?: string[];
  }
) {
  const ncdId = item.ncdInventoryId ?? (item.inventorySource === "ncd" ? item.id : undefined);
  const photos = (patch.images ?? (patch.imageUrl ? [patch.imageUrl] : undefined))
    ?.map((u) => String(u ?? "").trim())
    .filter(Boolean);
  const updates = {
    brand: patch.brand,
    model: patch.model,
    variant: patch.variant,
    fuel_type: patch.fuelType,
    transmission: patch.transmission,
    ex_showroom_price: patch.exShowroomPrice,
    on_road_price: patch.onRoadPrice,
    stock_status: patch.stockStatus,
    image_url: photos?.[0] ?? patch.imageUrl,
    ...(photos ? { images: photos } : {}),
  };

  if (ncdId) {
    if (hasConfiguredApi()) {
      await api.patch(`/api/new-car/inventory/${ncdId}`, updates);
    } else {
      await supabase.from("new_car_inventory").update(updates).eq("id", ncdId);
    }
  }

  const vehicleId = item.vehicleId;
  if (vehicleId) {
    await updateMarketplaceVehicle(vehicleId, {
      brand: patch.brand,
      model: patch.model,
      variant: patch.variant,
      fuelType: patch.fuelType,
      transmission: patch.transmission,
      exShowroomPrice: patch.exShowroomPrice,
      onRoadPrice: patch.onRoadPrice,
      imageUrl: photos?.[0] ?? patch.imageUrl,
      images: photos,
      stockStatus: patch.stockStatus,
    });
  }

  return { error: null as { message: string } | null };
}

export async function removeNewCarInventory(item: NcdInventoryItem) {
  const ncdId = item.ncdInventoryId ?? (item.inventorySource === "ncd" ? item.id : undefined);
  try {
    if (ncdId) {
      if (hasConfiguredApi()) {
        await api.delete(`/api/new-car/inventory/${ncdId}`);
      } else {
        await supabase.from("new_car_inventory").delete().eq("id", ncdId);
      }
    }
    if (item.vehicleId) {
      const { error } = await deleteVehicle(item.vehicleId, { cascadeInventory: false });
      if (error) return { error: { message: error.message ?? "Failed to delete linked vehicle" } };
    } else if (!ncdId && item.id) {
      // Grid item id may be vehicle id when sourced from vehicles table
      const { error } = await deleteVehicle(item.id);
      if (error) return { error: { message: error.message ?? "Delete failed" } };
    }
    return { error: null as { message: string } | null };
  } catch (e) {
    const ax = e as { response?: { data?: { message?: string } }; message?: string };
    return {
      error: {
        message: ax.response?.data?.message ?? ax.message ?? "Delete failed",
      },
    };
  }
}

export async function uploadDailyNewCarStock(
  dealerId: string,
  inventoryId: string,
  stockAfter: number,
  fileName?: string,
  notes?: string
) {
  if (!featureFlags.newCarInventoryV2 || !hasConfiguredApi()) {
    return { data: null, error: { message: "Daily stock API not configured" } };
  }
  try {
    const { data } = await api.post("/api/new-car/inventory/stock-upload", {
      dealer_id: dealerId,
      inventory_id: inventoryId,
      stock_after: stockAfter,
      file_name: fileName,
      notes,
    });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : "Upload failed" } };
  }
}

export async function createDealerLead(
  dealerId: string,
  payload: {
    customerName: string;
    phone: string;
    email?: string;
    city?: string;
    source?: string;
    preferredBrand?: string;
    preferredModel?: string;
    stage?: NcdLeadStage;
    tradeIn?: string;
  }
) {
  const stage = payload.stage ?? "new";
  return supabase.from("leads").insert({
    dealer_id: dealerId,
    name: payload.customerName.trim(),
    phone: payload.phone.replace(/\D/g, "").slice(-10),
    email: payload.email?.trim() || null,
    city: payload.city?.trim() || null,
    source: payload.source ?? "showroom",
    status: stage === "delivered" ? "converted" : stage === "lost" ? "lost" : stage === "contacted" ? "contacted" : "new",
    vehicle_interest: payload.preferredModel
      ? `${payload.preferredBrand ?? ""} ${payload.preferredModel}`.trim()
      : null,
    metadata: {
      stage,
      preferred_brand: payload.preferredBrand,
      preferred_model: payload.preferredModel,
      trade_in_vehicle: payload.tradeIn,
    },
  });
}

export async function updateNcdLeadStage(leadId: string, stage: NcdLeadStage) {
  const status =
    stage === "delivered" ? "converted" : stage === "lost" ? "lost" : stage === "contacted" ? "contacted" : "new";
  const { data: existing } = await supabase.from("leads").select("metadata").eq("id", leadId).maybeSingle();
  const meta = (existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {}) as Record<
    string,
    unknown
  >;
  return supabase
    .from("leads")
    .update({ status, metadata: { ...meta, stage } })
    .eq("id", leadId)
    .select()
    .single();
}

export async function fetchLeadDetail(leadId: string): Promise<NcdLeadDetail | null> {
  const { data: fromLeads } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (fromLeads) {
    const mapped = mapLeadRow(fromLeads as Record<string, unknown>);
    return {
      ...mapped,
      followups: [],
      whatsappCount: 0,
    };
  }

  const { data: fromLegacy } = await supabase.from("dealer_leads").select("*").eq("id", leadId).maybeSingle();
  if (fromLegacy) {
    const mapped = mapLeadRow(fromLegacy as Record<string, unknown>);
    return { ...mapped, followups: [], whatsappCount: 0 };
  }

  return null;
}
