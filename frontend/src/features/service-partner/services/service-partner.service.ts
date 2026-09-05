import { supabase } from "@/integrations/supabase/client";
import {
  computeBookingAnalytics,
  fetchCenterBookings,
  fetchWorkshopMechanics,
  resolveOwnedCenterId,
} from "@/features/service-booking/services/service-booking.service";
import type { ServiceBooking } from "@/features/service-booking/types";
import { emptyServicePartnerSnapshot } from "../data/mock-sh-data";
import type { ServicePartnerSnapshot, ShJobCard, ShTechnician, ShWorkflowStage } from "../types";

function bookingToJobCard(b: ServiceBooking, idx: number): ShJobCard {
  const vd = b.vehicleDetails as Record<string, string>;
  const vehicle = [vd?.make, vd?.model, vd?.year].filter(Boolean).join(" ") || "Vehicle";
  const stageMap: Record<string, ShWorkflowStage> = {
    pending: "waiting",
    confirmed: "waiting",
    in_progress: "in_repair",
    completed: "delivered",
    cancelled: "waiting",
  };
  return {
    id: b.id,
    jobNo: `JOB-${b.id.slice(0, 8).toUpperCase()}`,
    customerName: (b.metadata?.customerName as string) ?? "Customer",
    vehicle,
    complaints: b.notes ?? b.serviceName ?? "Service booking",
    estimatedTotal: b.totalAmount ?? b.paymentAmount ?? 0,
    labourAmount: Math.round((b.totalAmount ?? 0) * 0.35),
    stage: stageMap[b.status] ?? "waiting",
  };
}

async function fetchJobCards(centerId: string): Promise<ShJobCard[]> {
  const { data, error } = await supabase
    .from("service_job_cards")
    .select("*")
    .eq("service_center_id", centerId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data?.length) return [];
  return data.map((r) => ({
    id: r.id,
    jobNo: r.job_no,
    customerName: r.customer_name,
    customerPhone: r.customer_phone ?? undefined,
    vehicle: [r.vehicle_make, r.vehicle_model, r.vehicle_year].filter(Boolean).join(" "),
    vin: r.vin ?? undefined,
    complaints: r.complaints ?? "",
    technician: r.technician_id ?? undefined,
    labourAmount: Number(r.labour_amount ?? 0),
    estimatedTotal: Number(r.estimated_total ?? 0),
    stage: (r.workflow_stage as ShWorkflowStage) ?? "waiting",
    deliveryAt: r.delivery_at ?? undefined,
  }));
}

async function fetchCrmCustomers(centerId: string) {
  const { data } = await supabase
    .from("service_customers_crm")
    .select("*")
    .eq("service_center_id", centerId)
    .limit(30);
  if (!data?.length) return [];
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone ?? "",
    vehicles: Number((c.metadata as { vehicles?: number })?.vehicles ?? 1),
    visits: Number((c.metadata as { visits?: number })?.visits ?? 0),
    loyaltyPoints: c.loyalty_points ?? 0,
    lastVisit: (c.metadata as { lastVisit?: string })?.lastVisit ?? "—",
  }));
}

async function fetchAiInsights(centerId: string) {
  const { data } = await supabase
    .from("service_ai_logs")
    .select("*")
    .eq("service_center_id", centerId)
    .order("created_at", { ascending: false })
    .limit(8);
  if (!data?.length) return null;
  return data.map((i) => ({
    id: i.id,
    title: i.title,
    summary: i.summary ?? "",
    severity: (i.insight_type as "info" | "warning" | "success") ?? "info",
  }));
}

export async function fetchServicePartnerSnapshot(
  userId: string,
  userName: string,
  isAdmin?: boolean
): Promise<ServicePartnerSnapshot> {
  let centerId = await resolveOwnedCenterId(userId);
  if (!centerId && isAdmin) {
    const { data } = await supabase.from("service_centers").select("id, name, city, rating, is_verified").limit(1).maybeSingle();
    centerId = (data as { id: string } | null)?.id ?? null;
  }

  if (!centerId) {
    return emptyServicePartnerSnapshot(userName ? `${userName}'s workshop` : "Your workshop");
  }

  const { data: centerRow } = await supabase
    .from("service_centers")
    .select("id, name, city, rating, is_verified")
    .eq("id", centerId)
    .maybeSingle();

  const bookings = await fetchCenterBookings(centerId);
  const analytics = computeBookingAnalytics(bookings);
  const mechanics = await fetchWorkshopMechanics(centerId);
  let jobCards = await fetchJobCards(centerId);
  if (!jobCards.length && bookings.length) {
    jobCards = bookings.slice(0, 12).map((b, i) => bookingToJobCard(b, i));
  }

  const empty = emptyServicePartnerSnapshot(
    (centerRow as { name?: string })?.name ?? "Workshop",
    (centerRow as { city?: string })?.city ?? "India"
  );

  const activeJobs = bookings.filter((b) => b.status !== "completed" && b.status !== "cancelled").length;

  const technicians: ShTechnician[] = mechanics.map((m) => ({
    id: m.id,
    name: m.displayName,
    role: "technician",
    active: m.isActive,
    jobsToday: 0,
    skill: m.specialization ?? "General",
  }));

  const customers = await fetchCrmCustomers(centerId);
  const insights = (await fetchAiInsights(centerId)) ?? [];

  const kanban = empty.kanban.map((col) => ({
    ...col,
    jobs: jobCards.filter((j) => j.stage === col.stage),
  }));

  return {
    ...empty,
    centerId,
    profile: {
      id: centerId,
      name: (centerRow as { name?: string })?.name ?? empty.profile.name,
      city: (centerRow as { city?: string })?.city ?? empty.profile.city,
      rating: Number((centerRow as { rating?: number })?.rating ?? 0),
      isVerified: Boolean((centerRow as { is_verified?: boolean })?.is_verified),
      activeJobs,
      techniciansOnline: technicians.filter((t) => t.active).length,
      satisfactionPct: 0,
      branchCount: 0,
    },
    activeVehicles: activeJobs,
    bookings,
    jobCards,
    kanban,
    technicians,
    customers,
    insights,
    revenueToday: analytics.revenue > 0 ? analytics.revenue : 0,
    revenueMonth: 0,
    metrics: empty.metrics.map((m) => {
      if (m.key === "active") return { ...m, value: activeJobs };
      if (m.key === "completed") return { ...m, value: analytics.completed };
      if (m.key === "rev_today" && analytics.revenue > 0) {
        return { ...m, value: `₹${(analytics.revenue / 1000).toFixed(1)}K` };
      }
      return m;
    }),
  };
}
