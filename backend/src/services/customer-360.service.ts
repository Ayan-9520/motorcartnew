import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEnquiryPhone } from "@/lib/leads/enquiry.validation";
import { CustomerError } from "@/lib/customer/errors";
import { isOwnEnquiry } from "@/lib/customer/enquiries";
import { asRecord } from "@/lib/customer/json";
import {
  serializeDocument,
  serializeGarageVehicle,
  serializeIdentity,
  serializeInsuranceApplication,
  serializeInsuranceWallet,
  serializeNotification,
  serializeNotificationLog,
  serializePreferences,
  serializeReview,
  serializeServiceRecord,
} from "@/lib/customer/serialize";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SEGMENTS = new Set(["car", "bike", "ev", "commercial"]);

export type CustomerActor = { userId: string; role: string };

function mergeMeta(existing: unknown, patch: Record<string, unknown>): Prisma.InputJsonValue {
  return { ...asRecord(existing), ...patch } as Prisma.InputJsonValue;
}

async function requireUser(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!user) throw new CustomerError("Account not found", 404, "USER_NOT_FOUND");
  return user;
}

export async function getCustomer360(actor: CustomerActor) {
  const user = await requireUser(actor.userId);
  const phone = user.phone ? normalizeEnquiryPhone(user.phone) : null;
  const leadOr: Prisma.LeadWhereInput[] = [
    { metadata: { path: ["customer_user_id"], equals: actor.userId } },
  ];
  if (phone) leadOr.push({ phone });
  if (user.email) leadOr.push({ email: user.email });

  const [
    vehicles,
    prefs,
    documents,
    insuranceWallet,
    serviceRecords,
    notifications,
    notificationLogs,
    wishlists,
    financeApps,
    insuranceApps,
    reviews,
    serviceBookings,
    leadCandidates,
  ] = await Promise.all([
    prisma.customerVehicle.findMany({
      where: { userId: actor.userId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    }),
    prisma.customerPreference.findUnique({ where: { userId: actor.userId } }),
    prisma.vehicleDocument.findMany({ where: { userId: actor.userId }, orderBy: { createdAt: "desc" } }),
    prisma.insuranceWallet.findMany({ where: { userId: actor.userId }, orderBy: { createdAt: "desc" } }),
    prisma.serviceRecord.findMany({
      where: { userId: actor.userId },
      orderBy: { servicedAt: "desc" },
      take: 20,
    }),
    prisma.notification.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.notificationLog.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.wishlist.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.financeApplication.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.insuranceApplication.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.review.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.serviceBooking.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.lead.findMany({
      where: { OR: leadOr },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { dealer: { select: { name: true, slug: true } } },
    }),
  ]);

  const bankIds = [...new Set(financeApps.map((a) => a.bankId).filter((id): id is string => Boolean(id)))];
  const banks = bankIds.length
    ? await prisma.bank.findMany({ where: { id: { in: bankIds } }, select: { id: true, name: true } })
    : [];
  const bankName = Object.fromEntries(banks.map((b) => [b.id, b.name]));

  const vehicleLabel = (id?: string | null) => {
    if (!id) return undefined;
    const v = vehicles.find((row) => row.id === id);
    return v ? `${v.brand} ${v.model}` : undefined;
  };

  const serializedVehicles = vehicles.map(serializeGarageVehicle);
  const insurance = insuranceWallet.map((row) => serializeInsuranceWallet(row, vehicleLabel(row.vehicleId)));
  const services = serviceRecords.map((row) => serializeServiceRecord(row, vehicleLabel(row.vehicleId)));

  const notifs = [
    ...notifications.map(serializeNotification),
    ...notificationLogs.map(serializeNotificationLog),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const enquiries = leadCandidates
    .filter((lead) => isOwnEnquiry(actor.userId, phone, user.email, lead))
    .map((lead) => {
      const meta = asRecord(lead.metadata);
      return {
        id: lead.id,
        dealer_id: lead.dealerId,
        dealer_name: lead.dealer?.name ?? null,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        status: lead.status,
        vehicle_interest: lead.vehicleInterest,
        created_at: lead.createdAt.toISOString(),
        assignment: meta.assignment ?? null,
      };
    });

  const [
    quotations,
    testDrives,
    rewardAccount,
    savedSearches,
    reminders,
    saleRequests,
    identityCard,
  ] = await Promise.all([
    prisma.quotation.findMany({
      where: { customerUserId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, status: true, createdAt: true },
    }),
    prisma.testDriveBooking.findMany({
      where: { customerUserId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, status: true, createdAt: true, requestedStartAt: true },
    }),
    prisma.rewardAccount.findUnique({ where: { userId: actor.userId } }),
    prisma.savedSearch.findMany({ where: { userId: actor.userId }, orderBy: { updatedAt: "desc" } }),
    prisma.scheduledReminder.findMany({ where: { userId: actor.userId }, orderBy: { dueAt: "asc" } }),
    prisma.vehicleSaleRequest.findMany({
      where: { customerUserId: actor.userId },
      orderBy: { createdAt: "desc" },
      include: { offers: true, valuations: true },
    }),
    prisma.motorCartIdentity.findUnique({ where: { userId: actor.userId } }),
  ]);

  const lifecycle_alerts = [
    ...insurance
      .filter((i) => i.policy_end)
      .map((i) => ({
        kind: "insurance",
        title: "Insurance expiry on file",
        detail: i.policy_end,
        href: "/dashboard/customer/insurance-wallet",
      })),
    ...quotations
      .filter((q) => String(q.status) === "issued")
      .map((q) => ({
        kind: "quotation",
        title: "Open quotation",
        detail: q.id,
        href: `/dashboard/customer/quotations/${q.id}`,
      })),
    ...testDrives
      .filter((t) => String(t.status) === "confirmed" || String(t.status) === "requested")
      .map((t) => ({
        kind: "test_drive",
        title: "Test drive on file",
        detail: t.requestedStartAt.toISOString(),
        href: `/dashboard/customer/test-drives/${t.id}`,
      })),
    ...financeApps.slice(0, 3).map((a) => ({
      kind: "finance",
      title: "Finance application",
      detail: a.status,
      href: "/dashboard/customer/loans",
    })),
    ...saleRequests.map((s) => ({
      kind: "sell",
      title: "Sell request",
      detail: s.status,
      href: "/dashboard/customer/sell",
    })),
  ];
  const primary = serializedVehicles.find((v) => v.is_primary) ?? serializedVehicles[0];
  const primaryFinance = financeApps.find((a) => a.status === "disbursed" || a.status === "approved");

  return {
    identity: serializeIdentity(user),
    preferences: serializePreferences(prefs, user),
    vehicles: serializedVehicles,
    documents: documents.map(serializeDocument),
    insurance,
    insurance_applications: insuranceApps.map(serializeInsuranceApplication),
    insurance_claims: [] as unknown[],
    service_records: services,
    service_bookings: serviceBookings.map((b) => ({
      id: b.id,
      status: b.status,
      scheduled_at: b.scheduledAt?.toISOString() ?? null,
      created_at: b.createdAt.toISOString(),
    })),
    notifications: notifs,
    unread_notifications: notifs.filter((n) => !n.read).length,
    insights: lifecycle_alerts,
    lifecycle_alerts,
    motorcart_one: identityCard
      ? { public_id: identityCard.publicId, status: identityCard.status, member_since: identityCard.issuedAt.toISOString() }
      : null,
    quotations: quotations.map((q) => ({ id: q.id, status: q.status, created_at: q.createdAt.toISOString() })),
    test_drives: testDrives.map((t) => ({
      id: t.id,
      status: t.status,
      created_at: t.createdAt.toISOString(),
      requested_start_at: t.requestedStartAt.toISOString(),
    })),
    rewards: { balance: rewardAccount?.balance ?? 0, ledger: true },
    saved_searches: savedSearches.map((s) => ({ id: s.id, name: s.name, notify_on_match: s.notifyOnMatch })),
    reminders: reminders.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      due_at: r.dueAt.toISOString(),
      status: r.status,
    })),
    sell_requests: saleRequests.map((s) => ({
      id: s.id,
      status: s.status,
      brand: s.brand,
      model: s.model,
      offers: s.offers.map((o) => ({ id: o.id, amount: o.amount, status: o.status, valid_until: o.validUntil })),
      valuations: s.valuations.map((v) => ({
        id: v.id,
        amount_min: v.amountMin,
        amount_max: v.amountMax,
        status: v.status,
      })),
    })),
    campaigns: [] as unknown[],
    wishlist: {
      vehicle_ids: wishlists.map((w) => w.vehicleId),
      count: wishlists.length,
    },
    enquiries,
    reviews: reviews.map(serializeReview),
    finance_applications: financeApps.map((app) => ({
      id: app.id,
      status: app.status,
      loan_amount: app.loanAmount != null ? Number(app.loanAmount) : app.amount != null ? Number(app.amount) : null,
      tenure_months: app.tenureMonths ?? app.tenure,
      emi_amount: app.emiAmount != null ? Number(app.emiAmount) : null,
      bank_name: app.bankId ? bankName[app.bankId] ?? null : null,
      created_at: app.createdAt.toISOString(),
    })),
    finance_primary: primaryFinance
      ? {
          amount: primaryFinance.emiAmount != null ? Number(primaryFinance.emiAmount) : null,
          lender: primaryFinance.bankId ? bankName[primaryFinance.bankId] ?? null : null,
          status: primaryFinance.status,
        }
      : null,
    primary_vehicle_id: primary?.id ?? null,
    availability: {
      rewards_ledger: Boolean(rewardAccount),
      insurance_claims: false,
      ai_insights: false,
      fastag_provider: false,
      saved_searches: true,
      document_scan: false,
    },
  };
}

export async function listCustomerVehicles(actor: CustomerActor) {
  const rows = await prisma.customerVehicle.findMany({
    where: { userId: actor.userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(serializeGarageVehicle);
}

export async function createCustomerVehicle(
  actor: CustomerActor,
  input: {
    brand: string;
    model: string;
    year: number;
    registrationNumber?: string;
    segment?: string;
    isPrimary?: boolean;
    fuelType?: string;
    transmission?: string;
    variant?: string;
    registrationCity?: string;
    purchaseDate?: string;
    odometerKm?: number;
  },
) {
  const brand = input.brand.trim();
  const model = input.model.trim();
  const year = Number(input.year);
  if (brand.length < 2 || model.length < 1) {
    throw new CustomerError("Brand and model are required", 400, "INVALID_VEHICLE");
  }
  const thisYear = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 1980 || year > thisYear + 1) {
    throw new CustomerError("Year is invalid", 400, "INVALID_YEAR");
  }
  const segment = (input.segment ?? "car").toLowerCase();
  if (!SEGMENTS.has(segment)) {
    throw new CustomerError("Unsupported vehicle segment", 400, "INVALID_SEGMENT");
  }

  const count = await prisma.customerVehicle.count({ where: { userId: actor.userId } });
  const isPrimary = input.isPrimary ?? count === 0;
  if (isPrimary) {
    await prisma.customerVehicle.updateMany({
      where: { userId: actor.userId },
      data: { isPrimary: false },
    });
  }

  const row = await prisma.customerVehicle.create({
    data: {
      userId: actor.userId,
      brand,
      model,
      year,
      variant: input.variant?.trim() || null,
      fuelType: input.fuelType?.trim() || "petrol",
      transmission: input.transmission?.trim() || "manual",
      registrationNumber: input.registrationNumber?.trim() || null,
      segment,
      isPrimary,
      metadata: {
        registration_city: input.registrationCity?.trim() || undefined,
        purchase_date: input.purchaseDate || undefined,
        odometer_km: input.odometerKm,
        fastag_balance: 0,
      } as Prisma.InputJsonValue,
    },
  });
  return serializeGarageVehicle(row);
}

export async function updateCustomerVehicle(
  actor: CustomerActor,
  vehicleId: string,
  input: {
    isPrimary?: boolean;
    registrationNumber?: string;
    odometerKm?: number;
    fastagBalance?: number;
    registrationCity?: string;
  },
) {
  if (!UUID_RE.test(vehicleId)) throw new CustomerError("Invalid vehicle id", 400, "INVALID_ID");
  const existing = await prisma.customerVehicle.findFirst({
    where: { id: vehicleId, userId: actor.userId },
  });
  if (!existing) throw new CustomerError("Vehicle not found", 404, "VEHICLE_NOT_FOUND");

  if (input.isPrimary) {
    await prisma.customerVehicle.updateMany({
      where: { userId: actor.userId },
      data: { isPrimary: false },
    });
  }

  const metaPatch: Record<string, unknown> = {};
  if (input.odometerKm != null) metaPatch.odometer_km = input.odometerKm;
  if (input.fastagBalance != null) {
    if (input.fastagBalance < 0 || input.fastagBalance > 100_000) {
      throw new CustomerError("Invalid FASTag balance", 400, "INVALID_FASTAG");
    }
    metaPatch.fastag_balance = input.fastagBalance;
  }
  if (input.registrationCity != null) metaPatch.registration_city = input.registrationCity;

  const row = await prisma.customerVehicle.update({
    where: { id: vehicleId },
    data: {
      isPrimary: input.isPrimary ?? existing.isPrimary,
      registrationNumber:
        input.registrationNumber !== undefined ? input.registrationNumber.trim() || null : existing.registrationNumber,
      metadata: Object.keys(metaPatch).length ? mergeMeta(existing.metadata, metaPatch) : undefined,
    },
  });
  return serializeGarageVehicle(row);
}

export async function deleteCustomerVehicle(actor: CustomerActor, vehicleId: string) {
  if (!UUID_RE.test(vehicleId)) throw new CustomerError("Invalid vehicle id", 400, "INVALID_ID");
  const result = await prisma.customerVehicle.deleteMany({
    where: { id: vehicleId, userId: actor.userId },
  });
  if (!result.count) throw new CustomerError("Vehicle not found", 404, "VEHICLE_NOT_FOUND");
  return { removed: true };
}

export async function upsertCustomerPreferences(
  actor: CustomerActor,
  input: {
    dob?: string | null;
    anniversary?: string | null;
    preferredBrand?: string | null;
    city?: string | null;
    state?: string | null;
    notifyInsurance?: boolean;
    notifyService?: boolean;
  },
) {
  const existing = await prisma.customerPreference.findUnique({ where: { userId: actor.userId } });
  const meta = {
    ...asRecord(existing?.metadata),
    ...(input.dob !== undefined ? { dob: input.dob } : {}),
    ...(input.anniversary !== undefined ? { anniversary: input.anniversary } : {}),
    ...(input.preferredBrand !== undefined ? { preferred_brand: input.preferredBrand } : {}),
    ...(input.city !== undefined ? { city: input.city } : {}),
    ...(input.state !== undefined ? { state: input.state } : {}),
  };

  const row = await prisma.customerPreference.upsert({
    where: { userId: actor.userId },
    create: {
      userId: actor.userId,
      notifyInsurance: input.notifyInsurance ?? true,
      notifyService: input.notifyService ?? true,
      profileCompletion: 0,
      rewardPointsBalance: 0,
      metadata: meta as Prisma.InputJsonValue,
    },
    update: {
      notifyInsurance: input.notifyInsurance ?? existing?.notifyInsurance,
      notifyService: input.notifyService ?? existing?.notifyService,
      metadata: meta as Prisma.InputJsonValue,
    },
  });
  const user = await requireUser(actor.userId);
  return serializePreferences(row, user);
}

export async function listCustomerEnquiries(actor: CustomerActor) {
  const snap = await getCustomer360(actor);
  return snap.enquiries;
}

export async function markCustomerNotificationRead(actor: CustomerActor, notificationId: string) {
  const raw = decodeURIComponent(notificationId);
  const logId = raw.startsWith("log_") ? raw.slice(4) : raw.startsWith("system:log_") ? raw.slice("system:log_".length) : null;

  if (logId && UUID_RE.test(logId)) {
    const result = await prisma.notificationLog.updateMany({
      where: { id: logId, userId: actor.userId },
      data: { readAt: new Date() },
    });
    if (!result.count) throw new CustomerError("Notification not found", 404, "NOT_FOUND");
    return { id: raw, read: true };
  }

  const nativeId = raw.includes(":") ? raw.split(":").slice(1).join(":") : raw;
  if (!UUID_RE.test(nativeId)) throw new CustomerError("Invalid notification id", 400, "INVALID_ID");

  const result = await prisma.notification.updateMany({
    where: { id: nativeId, userId: actor.userId },
    data: { isRead: true, readAt: new Date() },
  });
  if (!result.count) throw new CustomerError("Notification not found", 404, "NOT_FOUND");
  return { id: raw, read: true };
}

export function recordedFastagBalance(current: number | undefined, add: number) {
  const next = (current ?? 0) + add;
  if (add <= 0) throw new CustomerError("Amount must be positive", 400, "INVALID_AMOUNT");
  if (next > 100_000) throw new CustomerError("Recorded FASTag balance is too high", 400, "INVALID_FASTAG");
  return next;
}

export async function getCustomerActivity(actor: CustomerActor) {
  const [vehicles, enquiries, quotations, drives, finance, rewards, sales] = await Promise.all([
    prisma.customerVehicle.findMany({ where: { userId: actor.userId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.lead.findMany({
      where: { customerUserId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, createdAt: true, vehicleInterest: true },
    }),
    prisma.quotation.findMany({
      where: { customerUserId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, status: true, createdAt: true, issuedAt: true },
    }),
    prisma.testDriveBooking.findMany({
      where: { customerUserId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, status: true, createdAt: true, completedAt: true },
    }),
    prisma.financeApplication.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, status: true, createdAt: true },
    }),
    prisma.rewardLedger.findMany({
      where: { account: { userId: actor.userId }, entryType: "EARN" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.vehicleSaleRequest.findMany({
      where: { customerUserId: actor.userId },
      include: { offers: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const events = [
    ...vehicles.map((v) => ({ at: v.createdAt, type: "vehicle_added", title: `Vehicle added: ${v.brand} ${v.model}` })),
    ...enquiries.map((e) => ({ at: e.createdAt, type: "enquiry", title: "Enquiry submitted" })),
    ...quotations.filter((q) => q.issuedAt).map((q) => ({ at: q.issuedAt!, type: "quotation_issued", title: "Quotation issued" })),
    ...drives.map((d) => ({ at: d.createdAt, type: "test_drive_requested", title: "Test drive requested" })),
    ...drives.filter((d) => d.completedAt).map((d) => ({ at: d.completedAt!, type: "test_drive_completed", title: "Test drive completed" })),
    ...finance.map((f) => ({ at: f.createdAt, type: "finance_application", title: "Finance application created" })),
    ...rewards.map((r) => ({ at: r.createdAt, type: "reward_earned", title: r.reason })),
    ...sales.map((s) => ({ at: s.createdAt, type: "sell_request", title: `Sell request: ${s.brand} ${s.model}` })),
    ...sales.flatMap((s) => s.offers.map((o) => ({ at: o.createdAt, type: "dealer_offer", title: "Dealer offer received" }))),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  return events.map((e) => ({ ...e, at: e.at.toISOString() }));
}
