import { supabase } from "@/shared/api/client";
import { getVehicleHero } from "@/lib/media/vehicle-media-registry";
import { buildMockNewCarDealerSnapshot, getLeadDetail } from "../data/mock-ncd-data";
import type { NewCarDealerSnapshot, NcdInventoryItem, NcdLead, NcdLeadDetail } from "../types";

function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const m = (err.message ?? "").toLowerCase();
  return err.code === "42P01" || err.code === "PGRST205" || m.includes("does not exist") || m.includes("unknown table");
}

function mapInventoryRow(r: Record<string, unknown>, fallbackImage: string): NcdInventoryItem {
  const meta = (r.metadata && typeof r.metadata === "object" ? r.metadata : {}) as Record<string, unknown>;
  const brand = String(r.brand ?? meta.brand ?? "Brand");
  const model = String(r.model ?? meta.model ?? "Model");
  const ex = Number(r.ex_showroom_price ?? r.price ?? meta.exShowroomPrice ?? 0);
  const onRoad = Number(r.on_road_price ?? r.price ?? ex);
  return {
    id: String(r.id),
    brand,
    model,
    variant: String(r.variant ?? meta.variant ?? "Standard"),
    fuelType: String(r.fuel_type ?? meta.fuelType ?? "Petrol"),
    transmission: String(r.transmission ?? meta.transmission ?? "Manual"),
    exShowroomPrice: ex,
    onRoadPrice: onRoad,
    discountAmount: Number(r.discount_amount ?? meta.discountAmount ?? 0),
    stockStatus: (r.stock_status ?? meta.stockStatus ?? "available") as NcdInventoryItem["stockStatus"],
    stockHealth: (r.stock_health ?? meta.stockHealth ?? "fast_moving") as NcdInventoryItem["stockHealth"],
    colors: Array.isArray(r.colors) ? (r.colors as string[]) : ["White"],
    expectedDeliveryDays: (r.expected_delivery_days as number | undefined) ?? undefined,
    imageUrl: String(r.image_url ?? meta.imageUrl ?? fallbackImage),
  };
}

function mapLeadRow(r: Record<string, unknown>): NcdLead {
  const meta = (r.metadata && typeof r.metadata === "object" ? r.metadata : {}) as Record<string, unknown>;
  return {
    id: String(r.id),
    customerName: String(r.customer_name ?? r.name ?? meta.customerName ?? "Customer"),
    phone: String(r.phone ?? ""),
    email: (r.email as string | undefined) ?? undefined,
    city: String(r.city ?? meta.city ?? ""),
    source: String(r.source ?? "website"),
    stage: (r.stage ?? r.status ?? meta.stage ?? "new") as NcdLead["stage"],
    preferredBrand: (r.preferred_brand as string | undefined) ?? undefined,
    preferredModel: (r.preferred_model as string | undefined) ?? undefined,
    budgetMax: r.budget_max != null ? Number(r.budget_max) : undefined,
    tradeIn: (r.trade_in_vehicle as string | undefined) ?? undefined,
    financeInterest: Boolean(r.finance_interest ?? false),
    insuranceInterest: Boolean(r.insurance_interest ?? false),
    assignedTo: r.assigned_to as string | undefined,
    score: Number(r.score ?? 0),
    createdAt: String(r.created_at ?? new Date().toISOString()),
  };
}

function snapshotFromReal(
  mock: NewCarDealerSnapshot,
  inventory: NcdInventoryItem[],
  leads: NcdLead[],
  dealerName: string
): NewCarDealerSnapshot {
  const bookings = leads.filter((l) => l.stage === "booking").length;
  const delivered = leads.filter((l) => l.stage === "delivered").length;

  return {
    ...mock,
    showroom: { ...mock.showroom, name: dealerName },
    inventory,
    leads,
    metrics: mock.metrics.map((m) => {
      if (m.key === "leads") return { ...m, value: leads.length, sublabel: `${leads.filter((l) => ["new", "interested", "test_drive"].includes(l.stage)).length} hot` };
      if (m.key === "sold") return { ...m, value: delivered };
      if (m.key === "deliveries") return { ...m, value: Math.max(0, bookings) };
      return m;
    }),
    hotLeadsCount: leads.filter((l) => ["new", "interested", "test_drive"].includes(l.stage)).length,
  };
}

export async function fetchNewCarDealerSnapshot(
  dealerId?: string,
  dealerName?: string
): Promise<NewCarDealerSnapshot> {
  const mock = buildMockNewCarDealerSnapshot(dealerName ?? "Your showroom");
  if (!dealerId) return mock;

  const fallbackImg =
    mock.inventory[0]?.imageUrl ?? getVehicleHero({ brand: "Car", model: "Sedan", bodyType: "Sedan" });

  const { data: inv, error: invErr } = await supabase
    .from("new_car_inventory")
    .select("*")
    .eq("dealer_id", dealerId)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: leadRows } = await supabase
    .from("dealer_leads")
    .select("*")
    .eq("dealer_id", dealerId)
    .order("created_at", { ascending: false })
    .limit(100);

  const hasInv = !isMissingTable(invErr) && (inv?.length ?? 0) > 0;
  const hasLeads = (leadRows?.length ?? 0) > 0;

  if (!hasInv && !hasLeads) {
    return { ...mock, showroom: { ...mock.showroom, name: dealerName ?? mock.showroom.name } };
  }

  const inventory = hasInv
    ? (inv as Record<string, unknown>[]).map((r) => mapInventoryRow(r, fallbackImg))
    : [];
  const leads = hasLeads ? (leadRows as Record<string, unknown>[]).map(mapLeadRow) : [];

  return snapshotFromReal(mock, inventory, leads, dealerName ?? mock.showroom.name);
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
  }
) {
  const ex = payload.exShowroomPrice;
  const onRoad = payload.onRoadPrice ?? Math.round(ex * 1.12);
  return supabase.from("new_car_inventory").insert({
    dealer_id: dealerId,
    brand: payload.brand.trim(),
    model: payload.model.trim(),
    variant: payload.variant.trim(),
    fuel_type: payload.fuelType,
    transmission: payload.transmission,
    ex_showroom_price: ex,
    on_road_price: onRoad,
    price: ex,
    stock: 1,
    stock_status: payload.stockStatus ?? "available",
    stock_health: "fast_moving",
    colors: ["White"],
    image_url:
      payload.imageUrl ?? getVehicleHero({ brand: payload.brand, model: payload.model, bodyType: "Sedan" }),
    expected_delivery_days: 14,
    year: new Date().getFullYear(),
  });
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
  }
) {
  return supabase.from("dealer_leads").insert({
    dealer_id: dealerId,
    customer_name: payload.customerName.trim(),
    name: payload.customerName.trim(),
    phone: payload.phone.replace(/\D/g, "").slice(-10),
    email: payload.email?.trim() || null,
    city: payload.city?.trim() || null,
    source: payload.source ?? "showroom",
    stage: "new",
    status: "new",
    preferred_brand: payload.preferredBrand ?? null,
    preferred_model: payload.preferredModel ?? null,
    finance_interest: false,
    insurance_interest: false,
    score: 50,
  });
}

export async function fetchLeadDetail(leadId: string): Promise<NcdLeadDetail | null> {
  const { data, error } = await supabase.from("dealer_leads").select("*").eq("id", leadId).maybeSingle();
  if (isMissingTable(error) || !data) return getLeadDetail(leadId);
  const row = data as Record<string, unknown>;
  const mapped = mapLeadRow(row);
  const base = getLeadDetail(leadId);
  return {
    ...(base ?? {
      id: mapped.id,
      customerName: mapped.customerName,
      phone: mapped.phone,
      stage: mapped.stage,
      timeline: [],
      notes: [],
      followups: [],
      whatsappCount: 0,
    }),
    ...mapped,
    customerName: mapped.customerName,
    phone: mapped.phone,
    followups: base?.followups ?? [],
    whatsappCount: base?.whatsappCount ?? 0,
  };
}
