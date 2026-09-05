import type {
  CustomerPreference,
  CustomerVehicle,
  InsuranceApplication,
  InsuranceWallet,
  Notification,
  NotificationLog,
  Review,
  ServiceRecord,
  VehicleDocument,
  Wishlist,
} from "@prisma/client";
import { asNumber, asRecord, asString, daysUntil } from "./json";

export function serializeIdentity(user: {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  city: string | null;
  state: string | null;
  avatarUrl: string | null;
  kycStatus: string;
  role: string;
  profileCompletion: number;
}) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    full_name: user.fullName,
    city: user.city,
    state: user.state,
    avatar_url: user.avatarUrl,
    kyc_status: user.kycStatus,
    role: user.role,
    profile_completion: user.profileCompletion,
  };
}

export function serializePreferences(row: CustomerPreference | null, user: { city: string | null; state: string | null; profileCompletion: number }) {
  const meta = asRecord(row?.metadata);
  return {
    dob: asString(meta.dob),
    anniversary: asString(meta.anniversary),
    preferred_brand: asString(meta.preferred_brand),
    city: asString(meta.city) ?? user.city ?? undefined,
    state: asString(meta.state) ?? user.state ?? undefined,
    notify_insurance: row?.notifyInsurance ?? true,
    notify_service: row?.notifyService ?? true,
    profile_completion: row?.profileCompletion ?? user.profileCompletion,
    loyalty_tier: asString(meta.loyalty_tier) ?? "Bronze",
    reward_points_balance: row?.rewardPointsBalance ?? 0,
  };
}

export function serializeGarageVehicle(row: CustomerVehicle) {
  const meta = asRecord(row.metadata);
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    variant: row.variant ?? undefined,
    year: row.year,
    fuel_type: row.fuelType ?? "petrol",
    transmission: row.transmission ?? "manual",
    registration_number: row.registrationNumber ?? undefined,
    registration_city: asString(meta.registration_city),
    segment: row.segment,
    ownership_number: asNumber(meta.ownership_number) ?? 1,
    purchase_date: asString(meta.purchase_date),
    odometer_km: asNumber(meta.odometer_km),
    health_score: row.healthScore ?? undefined,
    resale_estimate: asNumber(meta.resale_estimate),
    fastag_balance: asNumber(meta.fastag_balance) ?? 0,
    is_primary: row.isPrimary,
    created_at: row.createdAt.toISOString(),
  };
}

export function serializeDocument(row: VehicleDocument) {
  const expires = row.expiresAt?.toISOString() ?? undefined;
  return {
    id: row.id,
    vehicle_id: row.vehicleId ?? undefined,
    doc_type: row.docType,
    title: row.title,
    document_number: row.documentNumber ?? undefined,
    file_url: row.fileUrl ?? undefined,
    verified: row.verified,
    expires_at: expires,
    days_until_expiry: daysUntil(row.expiresAt),
  };
}

export function serializeInsuranceWallet(row: InsuranceWallet, vehicleLabel?: string) {
  const meta = asRecord(row.metadata);
  const end = row.policyEnd?.toISOString() ?? asString(meta.policy_end);
  const daysLeft = daysUntil(end);
  return {
    id: row.id,
    vehicle_id: row.vehicleId ?? undefined,
    vehicle_label: asString(meta.vehicle_label) ?? vehicleLabel ?? "Vehicle",
    insurer_name: row.insurerName,
    policy_number: row.policyNumber ?? undefined,
    plan_type: asString(meta.plan_type) ?? "Policy",
    idv_amount: asNumber(meta.idv_amount) ?? 0,
    annual_premium: asNumber(meta.annual_premium) ?? 0,
    ncb_percent: asNumber(meta.ncb_percent) ?? 0,
    policy_end: end,
    days_left: daysLeft,
    claim_count: asNumber(meta.claim_count) ?? 0,
    status: row.status || (daysLeft != null && daysLeft <= 15 ? "expiring" : "active"),
  };
}

export function serializeServiceRecord(row: ServiceRecord, vehicleLabel?: string) {
  const meta = asRecord(row.metadata);
  return {
    id: row.id,
    vehicle_id: row.vehicleId ?? undefined,
    vehicle_label: asString(meta.vehicle_label) ?? vehicleLabel ?? "Vehicle",
    service_type: row.serviceType,
    service_center: row.serviceCenter ?? undefined,
    amount: row.amount != null ? Number(row.amount) : undefined,
    serviced_at: row.servicedAt.toISOString(),
    next_due_date: asString(meta.next_due_date),
  };
}

export function serializeNotification(row: Notification) {
  const payload = asRecord(row.payload);
  return {
    id: row.id,
    type: (asString(row.kind) ?? "system") as string,
    title: row.title,
    body: row.body || row.message || undefined,
    action_url: asString(payload.deep_link) ?? asString(payload.action_url),
    created_at: row.createdAt.toISOString(),
    read: row.isRead || row.readAt != null,
  };
}

export function serializeNotificationLog(row: NotificationLog) {
  const meta = asRecord(row.metadata);
  return {
    id: `log_${row.id}`,
    type: row.type || "system",
    title: row.title,
    body: row.body ?? undefined,
    action_url: asString(meta.action_url) ?? asString(meta.deep_link),
    created_at: row.createdAt.toISOString(),
    read: row.readAt != null,
  };
}

export function serializeReview(row: Review) {
  return {
    id: row.id,
    entity_type: row.entityType,
    entity_id: row.entityId,
    rating: row.rating,
    title: row.title ?? undefined,
    comment: row.comment ?? undefined,
    created_at: row.createdAt.toISOString(),
  };
}

export function serializeInsuranceApplication(row: InsuranceApplication) {
  return {
    id: row.id,
    provider: row.provider ?? undefined,
    premium: row.premium != null ? Number(row.premium) : undefined,
    status: row.status,
    created_at: row.createdAt.toISOString(),
  };
}

export function serializeWishlistIds(rows: Wishlist[]) {
  return rows.map((w) => w.vehicleId);
}
