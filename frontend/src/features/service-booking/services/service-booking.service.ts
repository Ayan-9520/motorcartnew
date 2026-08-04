import { supabase } from "@/integrations/supabase/client";
import type { BookingStatus, DbBooking, DbReview, DbService, DbServiceCenter } from "@/types/database";
import { MOCK_SERVICE_CENTERS, MOCK_SERVICES } from "../data/mock-service-data";
import { realDataOnly } from "@/config/real-data";
import type {
  BookingAnalytics,
  BookingTrackingEvent,
  BookingTrackingStep,
  PaymentStatus,
  ServiceBooking,
  ServiceCatalogItem,
  ServiceCenter,
  ServiceInvoice,
  VehicleServiceHistoryEntry,
  WorkshopMechanic,
} from "../types";

const LS_BOOKINGS = "motorcart_service_bookings_v1";

function readLocalBookings(): ServiceBooking[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_BOOKINGS);
    return raw ? (JSON.parse(raw) as ServiceBooking[]) : [];
  } catch {
    return [];
  }
}

function writeLocalBookings(rows: ServiceBooking[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LS_BOOKINGS, JSON.stringify(rows.slice(0, 50)));
}

function genOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const TRACKING_STEPS: BookingTrackingStep[] = [
  "scheduled",
  "confirmed",
  "mechanic_assigned",
  "en_route",
  "arrived",
  "in_service",
  "completed",
  "cancelled",
];

function asTrackingStep(v: string | undefined | null): BookingTrackingStep {
  if (v && (TRACKING_STEPS as string[]).includes(v)) return v as BookingTrackingStep;
  return "scheduled";
}

function asPaymentStatus(v: string | undefined | null): PaymentStatus {
  if (v === "paid" || v === "refunded" || v === "failed") return v;
  return "pending";
}

export function mapServiceCenter(row: DbServiceCenter): ServiceCenter {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    phone: row.phone,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    servicesOffered: row.services_offered ?? [],
    vehicleHubs: (row as { vehicle_hubs?: ServiceCenter["vehicleHubs"] }).vehicle_hubs,
    isVerified: row.is_verified,
    isActive: row.is_active !== false,
    images: row.images?.length ? row.images : [],
    pickupDropAvailable: row.pickup_drop_available !== false,
    slotIntervalMinutes: row.slot_interval_minutes ?? 30,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    createdAt: row.created_at,
  };
}

export function mapCatalogItem(
  row: DbService,
  center?: { name: string; slug: string } | null
): ServiceCatalogItem {
  return {
    id: row.id,
    serviceCenterId: row.service_center_id,
    centerName: center?.name,
    centerSlug: center?.slug,
    name: row.name,
    slug: row.slug,
    serviceType: row.service_type,
    description: row.description,
    priceFrom: Number(row.price_from),
    priceTo: row.price_to != null ? Number(row.price_to) : null,
    durationMinutes: row.duration_minutes,
    isDoorstep: row.is_doorstep,
    isActive: row.is_active,
    images: row.images ?? [],
    createdAt: row.created_at,
  };
}

export function mapBooking(
  row: DbBooking,
  extras?: { serviceName?: string; centerName?: string }
): ServiceBooking {
  return {
    id: row.id,
    userId: row.user_id,
    serviceId: row.service_id,
    serviceCenterId: row.service_center_id,
    serviceName: extras?.serviceName,
    centerName: extras?.centerName,
    vehicleDetails: row.vehicle_details ?? {},
    scheduledAt: row.scheduled_at,
    status: row.status,
    totalAmount: row.total_amount != null ? Number(row.total_amount) : null,
    otpVerified: row.otp_verified,
    notes: row.notes,
    mechanicId: row.mechanic_id ?? null,
    pickupAddress: row.pickup_address ?? null,
    dropAddress: row.drop_address ?? null,
    paymentStatus: asPaymentStatus(row.payment_status),
    paymentAmount: row.payment_amount != null ? Number(row.payment_amount) : null,
    trackingStep: asTrackingStep(row.tracking_step),
    otpCode: row.otp_code ?? null,
    otpExpiresAt: row.otp_expires_at ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mergeCenters(db: ServiceCenter[]): ServiceCenter[] {
  if (realDataOnly || db.length >= 2) return db;
  const ids = new Set(db.map((c) => c.id));
  return [...db, ...MOCK_SERVICE_CENTERS.filter((m) => !ids.has(m.id))];
}

function mergeCatalog(db: ServiceCatalogItem[]): ServiceCatalogItem[] {
  if (realDataOnly || db.length >= 4) return db;
  const ids = new Set(db.map((s) => s.id));
  return [...db, ...MOCK_SERVICES.filter((m) => !ids.has(m.id))];
}

export async function fetchServiceCenters(city?: string): Promise<ServiceCenter[]> {
  let q = supabase.from("service_centers").select("*").order("rating", { ascending: false });
  if (city) q = q.ilike("city", city);
  const { data, error } = await q;
  let list: ServiceCenter[] = [];
  if (!error && data?.length) {
    list = (data as DbServiceCenter[]).map((r) => mapServiceCenter(r));
  }
  list = mergeCenters(list);
  if (city) list = list.filter((c) => c.city.toLowerCase().includes(city.toLowerCase()));
  return list.filter((c) => c.isActive);
}

export async function fetchServiceCenterBySlug(slug: string): Promise<ServiceCenter | null> {
  const { data, error } = await supabase.from("service_centers").select("*").eq("slug", slug).maybeSingle();
  if (!error && data) return mapServiceCenter(data as DbServiceCenter);
  if (realDataOnly) return null;
  return MOCK_SERVICE_CENTERS.find((c) => c.slug === slug) ?? null;
}

export async function fetchServiceCatalog(filters?: {
  category?: string;
  centerId?: string;
}): Promise<ServiceCatalogItem[]> {
  let q = supabase.from("services").select("*").eq("is_active", true);
  if (filters?.centerId) q = q.eq("service_center_id", filters.centerId);
  const { data, error } = await q;
  let list: ServiceCatalogItem[] = [];
  if (!error && data?.length) {
    const rows = data as DbService[];
    const centerIds = [...new Set(rows.map((r) => r.service_center_id))];
    const { data: centers } = await supabase.from("service_centers").select("id,name,slug").in("id", centerIds);
    const cmap = new Map((centers as { id: string; name: string; slug: string }[] | null)?.map((c) => [c.id, c]) ?? []);
    list = rows.map((r) => mapCatalogItem(r, cmap.get(r.service_center_id) ?? null));
  }
  list = mergeCatalog(list);
  if (filters?.centerId) list = list.filter((s) => s.serviceCenterId === filters.centerId);
  if (filters?.category) list = list.filter((s) => s.serviceType === filters.category);
  return list;
}

export async function fetchServiceById(id: string): Promise<ServiceCatalogItem | null> {
  const { data, error } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
  if (!error && data) {
    const row = data as DbService;
    const { data: c } = await supabase.from("service_centers").select("name,slug").eq("id", row.service_center_id).maybeSingle();
    const center = c as { name: string; slug: string } | null;
    return mapCatalogItem(row, center);
  }
  return MOCK_SERVICES.find((s) => s.id === id) ?? null;
}

export async function fetchBookedSlotStarts(centerId: string, fromIso: string, toIso: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("scheduled_at")
    .eq("service_center_id", centerId)
    .gte("scheduled_at", fromIso)
    .lte("scheduled_at", toIso)
    .neq("status", "cancelled");
  const fromDb =
    error || !data ? [] : (data as { scheduled_at: string }[]).map((r) => r.scheduled_at);
  const fromLocal = readLocalBookings()
    .filter(
      (b) =>
        b.serviceCenterId === centerId &&
        b.status !== "cancelled" &&
        b.scheduledAt >= fromIso &&
        b.scheduledAt <= toIso
    )
    .map((b) => b.scheduledAt);
  return [...new Set([...fromDb, ...fromLocal])];
}

export async function fetchMyBookings(userId: string): Promise<ServiceBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: false });
  const fromDb: ServiceBooking[] = [];
  if (!error && data?.length) {
    for (const row of data as DbBooking[]) {
      const svc = await fetchServiceById(row.service_id);
      const { data: c } = await supabase.from("service_centers").select("name").eq("id", row.service_center_id).maybeSingle();
      fromDb.push(
        mapBooking(row, {
          serviceName: svc?.name,
          centerName: (c as { name: string } | null)?.name,
        })
      );
    }
  }
  const local = readLocalBookings().filter((b) => b.userId === userId);
  const merged = [...fromDb, ...local.filter((l) => !fromDb.some((d) => d.id === l.id))];
  merged.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  return merged;
}

export async function fetchBookingById(id: string, userId?: string): Promise<ServiceBooking | null> {
  const { data, error } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!error && data) {
    const row = data as DbBooking;
    if (userId && row.user_id !== userId) return null;
    const svc = await fetchServiceById(row.service_id);
    const { data: c } = await supabase.from("service_centers").select("name").eq("id", row.service_center_id).maybeSingle();
    return mapBooking(row, { serviceName: svc?.name, centerName: (c as { name: string } | null)?.name });
  }
  const local = readLocalBookings().find((b) => b.id === id);
  if (local && (!userId || local.userId === userId)) return local;
  return null;
}

/** Center staff / technician — RLS must allow row */
export async function fetchBookingByIdStaff(id: string): Promise<ServiceBooking | null> {
  const { data, error } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!error && data) {
    const row = data as DbBooking;
    const svc = await fetchServiceById(row.service_id);
    const { data: c } = await supabase.from("service_centers").select("name").eq("id", row.service_center_id).maybeSingle();
    return mapBooking(row, { serviceName: svc?.name, centerName: (c as { name: string } | null)?.name });
  }
  const local = readLocalBookings().find((b) => b.id === id);
  return local ?? null;
}

export async function fetchCenterBookings(centerId: string): Promise<ServiceBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("service_center_id", centerId)
    .order("scheduled_at", { ascending: false });
  if (error || !data?.length) return [];
  const out: ServiceBooking[] = [];
  for (const row of data as DbBooking[]) {
    const svc = await fetchServiceById(row.service_id);
    out.push(mapBooking(row, { serviceName: svc?.name }));
  }
  return out;
}

export async function fetchTechnicianBookings(): Promise<ServiceBooking[]> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("mechanic_id", uid)
    .order("scheduled_at", { ascending: true });
  if (error || !data?.length) return [];
  const out: ServiceBooking[] = [];
  for (const row of data as DbBooking[]) {
    const svc = await fetchServiceById(row.service_id);
    out.push(mapBooking(row, { serviceName: svc?.name }));
  }
  return out;
}

export async function createBooking(input: {
  userId: string;
  serviceId: string;
  serviceCenterId: string;
  scheduledAt: string;
  vehicleDetails: Record<string, unknown>;
  notes?: string | null;
  pickupAddress?: string | null;
  dropAddress?: string | null;
  totalAmount?: number | null;
}): Promise<ServiceBooking> {
  const otp = genOtp();
  const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const insert = {
    user_id: input.userId,
    service_id: input.serviceId,
    service_center_id: input.serviceCenterId,
    vehicle_details: input.vehicleDetails,
    scheduled_at: input.scheduledAt,
    status: "pending" as BookingStatus,
    total_amount: input.totalAmount ?? null,
    otp_verified: false,
    notes: input.notes ?? null,
    pickup_address: input.pickupAddress ?? null,
    drop_address: input.dropAddress ?? null,
    payment_status: "pending",
    payment_amount: input.totalAmount ?? null,
    tracking_step: "scheduled",
    otp_code: otp,
    otp_expires_at: expires,
    metadata: {},
  };

  const { data, error } = await supabase.from("bookings").insert(insert).select("*").single();
  const svc = await fetchServiceById(input.serviceId);
  const center = (await fetchServiceCenters()).find((c) => c.id === input.serviceCenterId);

  if (!error && data) {
    return mapBooking(data as DbBooking, { serviceName: svc?.name, centerName: center?.name });
  }

  const fallback: ServiceBooking = {
    id: crypto.randomUUID(),
    userId: input.userId,
    serviceId: input.serviceId,
    serviceCenterId: input.serviceCenterId,
    serviceName: svc?.name,
    centerName: center?.name ?? MOCK_SERVICE_CENTERS.find((c) => c.id === input.serviceCenterId)?.name,
    vehicleDetails: input.vehicleDetails,
    scheduledAt: input.scheduledAt,
    status: "pending",
    totalAmount: input.totalAmount ?? svc?.priceFrom ?? null,
    otpVerified: false,
    notes: input.notes ?? null,
    mechanicId: null,
    pickupAddress: input.pickupAddress ?? null,
    dropAddress: input.dropAddress ?? null,
    paymentStatus: "pending",
    paymentAmount: input.totalAmount ?? svc?.priceFrom ?? null,
    trackingStep: "scheduled",
    otpCode: otp,
    otpExpiresAt: expires,
    metadata: { local_demo: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const all = readLocalBookings();
  all.unshift(fallback);
  writeLocalBookings(all);
  return fallback;
}

export async function updateBookingRecord(
  id: string,
  patch: Partial<{
    status: BookingStatus;
    trackingStep: BookingTrackingStep;
    mechanicId: string | null;
    paymentStatus: PaymentStatus;
    notes: string | null;
  }>
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.status != null) row.status = patch.status;
  if (patch.trackingStep != null) row.tracking_step = patch.trackingStep;
  if (patch.mechanicId !== undefined) row.mechanic_id = patch.mechanicId;
  if (patch.paymentStatus != null) row.payment_status = patch.paymentStatus;
  if (patch.notes !== undefined) row.notes = patch.notes;
  const { error } = await supabase.from("bookings").update(row).eq("id", id);
  if (error) {
    const all = readLocalBookings();
    const i = all.findIndex((b) => b.id === id);
    if (i >= 0) {
      const b = all[i];
      if (patch.status) b.status = patch.status;
      if (patch.trackingStep) b.trackingStep = patch.trackingStep;
      if (patch.mechanicId !== undefined) b.mechanicId = patch.mechanicId;
      if (patch.paymentStatus) b.paymentStatus = patch.paymentStatus;
      if (patch.notes !== undefined) b.notes = patch.notes;
      b.updatedAt = new Date().toISOString();
      writeLocalBookings(all);
    }
  }
}

export async function verifyBookingOtp(bookingId: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("verify_booking_otp", {
    p_booking_id: bookingId,
    p_otp: otp,
  });
  if (!error && data && typeof data === "object" && "ok" in data && (data as { ok: boolean }).ok) {
    return { ok: true };
  }
  const local = readLocalBookings().find((b) => b.id === bookingId);
  if (local?.otpCode === otp && local.otpExpiresAt && new Date(local.otpExpiresAt) > new Date()) {
    local.otpVerified = true;
    local.trackingStep = "confirmed";
    local.updatedAt = new Date().toISOString();
    const all = readLocalBookings().filter((b) => b.id !== bookingId);
    all.unshift(local);
    writeLocalBookings(all);
    return { ok: true };
  }
  return { ok: false, error: (data as { error?: string })?.error ?? error?.message ?? "Invalid OTP" };
}

export async function fetchCenterReviews(centerId: string): Promise<
  { id: string; rating: number; title: string | null; content: string | null; createdAt: string }[]
> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id,rating,title,content,created_at")
    .eq("entity_type", "service_center")
    .eq("entity_id", centerId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return (data as Pick<DbReview, "id" | "rating" | "title" | "content" | "created_at">[]).map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    content: r.content,
    createdAt: r.created_at,
  }));
}

export async function submitCenterReview(input: {
  userId: string;
  centerId: string;
  rating: number;
  title?: string;
  content?: string;
}): Promise<boolean> {
  const { error } = await supabase.from("reviews").insert({
    user_id: input.userId,
    entity_type: "service_center",
    entity_id: input.centerId,
    rating: input.rating,
    title: input.title ?? null,
    content: input.content ?? null,
    pros: [],
    cons: [],
    is_verified_purchase: true,
  });
  return !error;
}

export function computeBookingAnalytics(bookings: ServiceBooking[]): BookingAnalytics {
  const completed = bookings.filter((b) => b.status === "completed").length;
  const pending = bookings.filter((b) => b.status === "pending" || b.status === "confirmed" || b.status === "in_progress").length;
  const revenue = bookings
    .filter((b) => b.paymentStatus === "paid" || b.status === "completed")
    .reduce((s, b) => s + (b.paymentAmount ?? b.totalAmount ?? 0), 0);
  return {
    totalBookings: bookings.length,
    completed,
    pending,
    revenue,
    avgRating: 0,
  };
}

export async function resolveOwnedCenterId(userId: string): Promise<string | null> {
  const { data } = await supabase.from("service_centers").select("id").eq("owner_id", userId).maybeSingle();
  return (data as { id: string } | null)?.id ?? MOCK_SERVICE_CENTERS.find((c) => c.ownerId === userId)?.id ?? null;
}

export async function fetchWorkshopMechanics(centerId: string): Promise<WorkshopMechanic[]> {
  const { data } = await supabase
    .from("workshop_mechanics")
    .select("*")
    .eq("service_center_id", centerId)
    .eq("is_active", true);
  if (!data?.length) return [];
  return data.map((m) => ({
    id: m.id,
    serviceCenterId: m.service_center_id,
    userId: m.user_id,
    displayName: m.display_name,
    phone: m.phone,
    specialization: m.specialization,
    isActive: m.is_active,
  }));
}

export async function updateBookingTrackingRpc(bookingId: string, step: BookingTrackingStep, notes?: string) {
  const { data, error } = await supabase.rpc("update_booking_tracking", {
    p_booking_id: bookingId,
    p_step: step,
    p_notes: notes ?? null,
  });
  if (!error && data && (data as { ok: boolean }).ok) return { ok: true };
  await updateBookingRecord(bookingId, { trackingStep: step, status: step === "completed" ? "completed" : step === "cancelled" ? "cancelled" : undefined });
  return { ok: true };
}

export async function assignMechanicRpc(bookingId: string, mechanicId: string) {
  const { data, error } = await supabase.rpc("assign_booking_mechanic", {
    p_booking_id: bookingId,
    p_mechanic_id: mechanicId,
  });
  if (!error && data && (data as { ok: boolean }).ok) return { ok: true };
  return { ok: false, error: error?.message ?? (data as { error?: string })?.error };
}

export async function fetchTrackingEvents(bookingId: string): Promise<BookingTrackingEvent[]> {
  const { data } = await supabase
    .from("booking_tracking_events")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  if (!data?.length) return [];
  return data.map((e) => ({
    id: e.id,
    bookingId: e.booking_id,
    step: e.step,
    notes: e.notes,
    createdAt: e.created_at,
  }));
}

export async function fetchServiceInvoice(bookingId: string): Promise<ServiceInvoice | null> {
  const { data } = await supabase.from("service_invoices").select("*").eq("booking_id", bookingId).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    bookingId: data.booking_id,
    invoiceNumber: data.invoice_number,
    subtotal: Number(data.subtotal),
    gstAmount: Number(data.gst_amount),
    grandTotal: Number(data.grand_total),
    status: data.status,
    issuedAt: data.issued_at,
    lineItems: (data.line_items as Record<string, unknown>[]) ?? [],
  };
}

export async function generateServiceInvoiceRpc(bookingId: string) {
  const { data, error } = await supabase.rpc("generate_service_invoice", { p_booking_id: bookingId });
  if (error) return { ok: false, error: error.message };
  return data as { ok: boolean; invoice_number?: string; error?: string };
}

export async function fetchVehicleServiceHistory(userId: string): Promise<VehicleServiceHistoryEntry[]> {
  const { data } = await supabase
    .from("vehicle_service_history")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });
  if (!data?.length) {
    const bookings = await fetchMyBookings(userId);
    return bookings
      .filter((b) => b.status === "completed")
      .map((b) => ({
        id: b.id,
        userId: b.userId,
        bookingId: b.id,
        serviceName: b.serviceName ?? "Service",
        centerName: b.centerName ?? null,
        vehicleDetails: b.vehicleDetails,
        odometerKm: null,
        totalAmount: b.totalAmount,
        completedAt: b.scheduledAt,
        notes: b.notes,
      }));
  }
  return data.map((r) => ({
    id: r.id,
    userId: r.user_id,
    bookingId: r.booking_id,
    serviceName: r.service_name,
    centerName: r.center_name,
    vehicleDetails: r.vehicle_details ?? {},
    odometerKm: r.odometer_km,
    totalAmount: r.total_amount != null ? Number(r.total_amount) : null,
    completedAt: r.completed_at,
    notes: r.notes,
  }));
}
