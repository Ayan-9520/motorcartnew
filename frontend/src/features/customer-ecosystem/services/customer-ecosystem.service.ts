import { api, apiErrorMessage } from "@/lib/api/axios";
import { getVehicleHero } from "@/lib/media/vehicle-media-registry";
import { buildDashboardWidgets } from "../lib/profile-utils";
import type {
  CustomerEcosystemSnapshot,
  CustomerNotification,
  CustomerPreferences,
  CustomerVehicle,
  CustomerVehicleSegment,
  InsuranceWalletEntry,
  OwnershipTimelineEvent,
  ServiceRecord,
  VehicleDocument,
} from "../types";

export type CreateVehicleInput = {
  brand: string;
  model: string;
  year: number;
  registrationNumber?: string;
  segment?: CustomerVehicleSegment;
  isPrimary?: boolean;
};

export type UpsertPreferencesInput = Partial<
  Pick<CustomerPreferences, "dob" | "anniversary" | "preferredBrand" | "city" | "state">
>;

type Customer360Response = {
  data?: {
    identity?: { id: string; full_name?: string; city?: string | null; state?: string | null };
    preferences?: Record<string, unknown>;
    vehicles?: Record<string, unknown>[];
    documents?: Record<string, unknown>[];
    insurance?: Record<string, unknown>[];
    service_records?: Record<string, unknown>[];
    notifications?: Record<string, unknown>[];
    unread_notifications?: number;
    insights?: unknown[];
    lifecycle_alerts?: unknown[];
    campaigns?: unknown[];
    insurance_claims?: unknown[];
    wishlist?: { vehicle_ids?: string[]; count?: number };
    enquiries?: Record<string, unknown>[];
    finance_applications?: Record<string, unknown>[];
    finance_primary?: { amount?: number | null; lender?: string | null; status?: string } | null;
    availability?: {
      rewards_ledger?: boolean;
      insurance_claims?: boolean;
      ai_insights?: boolean;
      fastag_provider?: boolean;
      saved_searches?: boolean;
      document_scan?: boolean;
    };
  };
};

function emptySnapshot(): CustomerEcosystemSnapshot {
  const preferences: CustomerPreferences = {
    profileCompletion: 0,
    loyaltyTier: "Bronze",
    rewardPointsBalance: 0,
  };
  return {
    vehicles: [],
    documents: [],
    insurance: [],
    insuranceClaims: [],
    serviceRecords: [],
    notifications: [],
    insights: [],
    preferences,
    widgets: buildDashboardWidgets(undefined, preferences, 0),
    timeline: [],
    campaigns: [],
    unreadNotifications: 0,
    enquiries: [],
    wishlistVehicleIds: [],
    financeApplications: [],
    availability: {
      rewardsLedger: false,
      insuranceClaims: false,
      aiInsights: false,
      fastagProvider: false,
      savedSearches: false,
      documentScan: false,
    },
  };
}

function daysUntil(iso?: string): number | undefined {
  if (!iso) return undefined;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

function mapVehicle(
  row: Record<string, unknown>,
  insurance: InsuranceWalletEntry[],
  serviceRecords: ServiceRecord[],
  emi?: { amount: number; dueDate?: string; lender?: string },
): CustomerVehicle {
  const brand = String(row.brand ?? "");
  const model = String(row.model ?? "");
  const segment = String(row.segment ?? "car") as CustomerVehicleSegment;
  const bodyType = segment === "bike" ? "Scooter" : "SUV";
  const id = String(row.id);
  const ins = insurance.find((i) => i.vehicleId === id);
  const svc = serviceRecords.find((s) => s.vehicleId === id);
  const isPrimary = Boolean(row.is_primary ?? row.isPrimary);

  return {
    id,
    brand,
    model,
    variant: (row.variant as string | undefined) ?? undefined,
    year: Number(row.year),
    fuelType: String(row.fuel_type ?? row.fuelType ?? "petrol"),
    transmission: String(row.transmission ?? "manual"),
    registrationNumber: (row.registration_number as string | undefined) ?? (row.registrationNumber as string | undefined),
    registrationCity: (row.registration_city as string | undefined) ?? (row.registrationCity as string | undefined),
    segment,
    ownershipNumber: Number(row.ownership_number ?? row.ownershipNumber ?? 1),
    purchaseDate: (row.purchase_date as string | undefined) ?? (row.purchaseDate as string | undefined),
    odometerKm: row.odometer_km != null ? Number(row.odometer_km) : row.odometerKm != null ? Number(row.odometerKm) : undefined,
    healthScore: row.health_score != null ? Number(row.health_score) : undefined,
    resaleEstimate: row.resale_estimate != null ? Number(row.resale_estimate) : undefined,
    fastagBalance: Number(row.fastag_balance ?? row.fastagBalance ?? 0),
    isPrimary,
    imageUrl: getVehicleHero({ brand, model, bodyType, fuelType: String(row.fuel_type ?? "petrol") }),
    insuranceStatus: ins?.status ?? "none",
    insuranceDaysLeft: ins?.daysLeft,
    rcStatus: "pending",
    serviceDueDays: svc?.nextDueDate ? daysUntil(svc.nextDueDate) : undefined,
    emiDueAmount: isPrimary && emi?.amount != null ? emi.amount : undefined,
    emiDueDate: isPrimary ? emi?.dueDate : undefined,
    loanLender: isPrimary ? emi?.lender : undefined,
  };
}

function buildTimeline(
  vehicles: CustomerVehicle[],
  insurance: InsuranceWalletEntry[],
  serviceRecords: ServiceRecord[],
): OwnershipTimelineEvent[] {
  const events: OwnershipTimelineEvent[] = [];
  for (const v of vehicles) {
    if (v.purchaseDate) {
      events.push({
        id: `purchase-${v.id}`,
        date: v.purchaseDate,
        title: "Vehicle added",
        description: `${v.brand} ${v.model}`,
        type: "purchase",
        vehicleLabel: `${v.brand} ${v.model}`,
      });
    }
  }
  for (const ins of insurance) {
    if (ins.policyEnd) {
      events.push({
        id: `ins-${ins.id}`,
        date: ins.policyEnd,
        title: ins.status === "expiring" ? "Insurance renewal due" : "Insurance policy",
        description: `${ins.insurerName} · ${ins.planType}`,
        type: "insurance",
        vehicleLabel: ins.vehicleLabel,
      });
    }
  }
  for (const svc of serviceRecords) {
    events.push({
      id: `svc-${svc.id}`,
      date: svc.servicedAt.slice(0, 10),
      title: svc.serviceType,
      description: svc.serviceCenter,
      type: "service",
      vehicleLabel: svc.vehicleLabel,
    });
  }
  return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
}

function mapNotificationType(raw: string): CustomerNotification["type"] {
  const allowed: CustomerNotification["type"][] = [
    "emi",
    "insurance",
    "service",
    "auction",
    "price_drop",
    "dealer",
    "ai",
    "loyalty",
    "system",
  ];
  return allowed.includes(raw as CustomerNotification["type"]) ? (raw as CustomerNotification["type"]) : "system";
}

export async function fetchCustomerEcosystemSnapshot(
  userId: string | undefined
): Promise<CustomerEcosystemSnapshot> {
  if (!userId) return emptySnapshot();

  try {
    const { data } = await api.get<Customer360Response>("/api/customer/360");
    const payload = data.data;
    if (!payload) return emptySnapshot();

    const insurance: InsuranceWalletEntry[] = (payload.insurance ?? []).map((w) => ({
      id: String(w.id),
      vehicleId: w.vehicle_id as string | undefined,
      vehicleLabel: String(w.vehicle_label ?? "Vehicle"),
      insurerName: String(w.insurer_name ?? ""),
      policyNumber: w.policy_number as string | undefined,
      planType: String(w.plan_type ?? "Policy"),
      idvAmount: Number(w.idv_amount ?? 0),
      annualPremium: Number(w.annual_premium ?? 0),
      ncbPercent: Number(w.ncb_percent ?? 0),
      policyEnd: String(w.policy_end ?? ""),
      daysLeft: Number(w.days_left ?? 0),
      claimCount: Number(w.claim_count ?? 0),
      status: (w.status as InsuranceWalletEntry["status"]) ?? "active",
    }));

    const serviceRecords: ServiceRecord[] = (payload.service_records ?? []).map((s) => ({
      id: String(s.id),
      vehicleId: s.vehicle_id as string | undefined,
      vehicleLabel: String(s.vehicle_label ?? "Vehicle"),
      serviceType: String(s.service_type ?? ""),
      serviceCenter: s.service_center as string | undefined,
      amount: s.amount != null ? Number(s.amount) : undefined,
      servicedAt: String(s.serviced_at ?? ""),
      nextDueDate: s.next_due_date as string | undefined,
    }));

    const financePrimary = payload.finance_primary;
    const emi =
      financePrimary?.amount != null
        ? { amount: Number(financePrimary.amount), lender: financePrimary.lender ?? undefined }
        : undefined;

    const vehicles = (payload.vehicles ?? []).map((row) => mapVehicle(row, insurance, serviceRecords, emi));

    const documents: VehicleDocument[] = (payload.documents ?? []).map((d) => ({
      id: String(d.id),
      vehicleId: d.vehicle_id as string | undefined,
      docType: (d.doc_type as VehicleDocument["docType"]) ?? "other",
      title: String(d.title ?? ""),
      documentNumber: d.document_number as string | undefined,
      verified: Boolean(d.verified),
      expiresAt: d.expires_at as string | undefined,
      daysUntilExpiry: d.days_until_expiry != null ? Number(d.days_until_expiry) : daysUntil(d.expires_at as string | undefined),
    }));

    const notifications: CustomerNotification[] = (payload.notifications ?? []).map((n) => ({
      id: String(n.id),
      type: mapNotificationType(String(n.type ?? "system")),
      title: String(n.title ?? ""),
      body: n.body as string | undefined,
      actionUrl: (n.action_url as string | undefined) ?? undefined,
      createdAt: String(n.created_at ?? new Date().toISOString()),
      read: Boolean(n.read),
    }));

    const prefs = payload.preferences ?? {};
    const preferences: CustomerPreferences = {
      dob: prefs.dob as string | undefined,
      anniversary: prefs.anniversary as string | undefined,
      preferredBrand: (prefs.preferred_brand as string | undefined) ?? (prefs.preferredBrand as string | undefined),
      city: prefs.city as string | undefined,
      state: prefs.state as string | undefined,
      profileCompletion: Number(prefs.profile_completion ?? 0),
      loyaltyTier: String(prefs.loyalty_tier ?? "Bronze"),
      rewardPointsBalance: Number(prefs.reward_points_balance ?? 0),
      notifyInsurance: prefs.notify_insurance !== false,
      notifyService: prefs.notify_service !== false,
    };

    const availability = payload.availability ?? {};
    const primary = vehicles.find((v) => v.isPrimary) ?? vehicles[0];

    return {
      vehicles,
      documents,
      insurance,
      insuranceClaims: [],
      serviceRecords,
      notifications,
    insights: ((payload.lifecycle_alerts ?? payload.insights ?? []) as Record<string, unknown>[]).map((row, i) => ({
      id: String(row.id ?? `alert-${i}`),
      insightKey: String(row.kind ?? "lifecycle"),
      title: String(row.title ?? "Alert"),
      summary: String(row.detail ?? row.summary ?? ""),
      severity: "info" as const,
      actionLabel: row.href ? "Open" : undefined,
      actionUrl: row.href as string | undefined,
    })),
      preferences,
      widgets: buildDashboardWidgets(primary, preferences, 0),
      timeline: buildTimeline(vehicles, insurance, serviceRecords),
      campaigns: [],
      unreadNotifications: payload.unread_notifications ?? notifications.filter((n) => !n.read).length,
      enquiries: (payload.enquiries ?? []).map((e) => ({
        id: String(e.id),
        dealerName: (e.dealer_name as string | null) ?? null,
        status: String(e.status ?? "new"),
        vehicleInterest: (e.vehicle_interest as string | null) ?? null,
        createdAt: String(e.created_at ?? ""),
      })),
      wishlistVehicleIds: payload.wishlist?.vehicle_ids ?? [],
      financeApplications: (payload.finance_applications ?? []).map((a) => ({
        id: String(a.id),
        status: String(a.status ?? ""),
        loanAmount: a.loan_amount != null ? Number(a.loan_amount) : null,
        bankName: (a.bank_name as string | null) ?? null,
        createdAt: String(a.created_at ?? ""),
      })),
      availability: {
        rewardsLedger: Boolean(availability.rewards_ledger),
        insuranceClaims: Boolean(availability.insurance_claims),
        aiInsights: Boolean(availability.ai_insights),
        fastagProvider: Boolean(availability.fastag_provider),
        savedSearches: Boolean(availability.saved_searches),
        documentScan: Boolean(availability.document_scan),
      },
    };
  } catch (e) {
    console.warn("[customer-360]", apiErrorMessage(e));
    return emptySnapshot();
  }
}

export async function createCustomerVehicle(
  _userId: string,
  input: CreateVehicleInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.post("/api/customer/vehicles", {
      brand: input.brand,
      model: input.model,
      year: input.year,
      registration_number: input.registrationNumber,
      segment: input.segment,
      is_primary: input.isPrimary,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

export async function upsertCustomerPreferences(
  _userId: string,
  input: UpsertPreferencesInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.patch("/api/customer/preferences", {
      dob: input.dob,
      anniversary: input.anniversary,
      preferred_brand: input.preferredBrand,
      city: input.city,
      state: input.state,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

export async function updateCustomerVehicleFastag(
  vehicleId: string,
  _userId: string,
  balance: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.patch(`/api/customer/vehicles/${encodeURIComponent(vehicleId)}`, {
      fastag_balance: balance,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await api.post(`/api/customer/notifications/${encodeURIComponent(notificationId)}/read`);
  } catch (e) {
    console.warn("[customer-360] mark read", apiErrorMessage(e));
  }
}
