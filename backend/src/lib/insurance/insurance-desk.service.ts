import { Prisma, type InsuranceClaimRequest } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { JwtPayload } from "@/lib/auth/jwt";
import {
  INSURANCE_APPLICATION_STATUSES,
  INSURANCE_CLAIM_STATUSES,
  MOTOR_INSURERS,
  applicationStatusLabel,
  assessScenario,
  claimStatusLabel,
  computeInsurerQuote,
  findInsurer,
  motorPlanLabel,
  normalizeMotorQuoteInput,
  type InsuranceApplicationStatus,
  type InsuranceClaimRequestStatus,
  type MotorQuoteInput,
} from "./insurance-engine";

export const INSURANCE_DESK_ROLES = new Set(["admin", "super_admin", "broker"]);

export type DeskResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string; status?: number };

const fail = (error: string, status = 400): DeskResult<never> => ({ ok: false, error, status });

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REG_RE = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$|^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;
const PINCODE_RE = /^[1-9]\d{5}$/;

function str(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function cleanDocs(raw: unknown): { label: string; url: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d) => {
      const o = (d ?? {}) as Record<string, unknown>;
      const url = str(o.url, 500);
      return { label: str(o.label, 80) || "Document", url };
    })
    .filter((d) => /^(\/uploads\/|https:\/\/|http:\/\/(localhost|127\.0\.0\.1)[:/])/.test(d.url))
    .slice(0, 12);
}

export function normalizeReg(raw: unknown): string {
  return str(raw, 20).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function notifyUsers(userIds: string[], title: string, body: string, payload: Record<string, unknown>) {
  if (!userIds.length) return;
  await prisma.notification
    .createMany({
      data: userIds.map((userId) => ({
        userId,
        title,
        body,
        message: body,
        kind: "insurance",
        payload: payload as Prisma.InputJsonValue,
      })),
    })
    .catch(() => undefined);
}

async function deskUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ["super_admin", "admin", "broker"] }, deletedAt: null },
    select: { id: true },
    take: 50,
  });
  return users.map((u) => u.id);
}

type TimelineEntry = { status: string; at: string; note?: string; by?: string };

function pushTimeline(meta: Record<string, unknown>, entry: TimelineEntry): TimelineEntry[] {
  const prev = Array.isArray(meta.timeline) ? (meta.timeline as TimelineEntry[]) : [];
  return [...prev, entry].slice(-40);
}

function asMeta(v: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function serializeApplication(row: {
  id: string;
  userId: string;
  provider: string | null;
  premium: Prisma.Decimal | null;
  status: string;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider,
    premium: row.premium == null ? null : Number(row.premium),
    status: row.status,
    statusLabel: applicationStatusLabel(row.status),
    metadata: asMeta(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Applications                                                         */
/* ------------------------------------------------------------------ */

export async function createInsuranceApplication(auth: JwtPayload, body: Record<string, unknown>): Promise<DeskResult> {
  const quoteInput = normalizeMotorQuoteInput(body.quoteInput as Partial<MotorQuoteInput>);
  if (!quoteInput) return fail("Vehicle details are incomplete — please re-run the quote.");
  const insurer = findInsurer(str(body.insurerSlug, 60));
  if (!insurer) return fail("Choose an insurer from the quote list.");

  const owner = (body.owner ?? {}) as Record<string, unknown>;
  const vehicle = (body.vehicle ?? {}) as Record<string, unknown>;
  const fullName = str(owner.fullName, 100);
  const phone = str(owner.phone, 15).replace(/\D/g, "").slice(-10);
  const email = str(owner.email, 120);
  const address = str(owner.address, 300);
  const pincode = str(owner.pincode, 6);
  const dob = str(owner.dob, 10);
  const nomineeName = str(owner.nomineeName, 100);
  const nomineeRelation = str(owner.nomineeRelation, 40);
  const nomineeAge = Number(owner.nomineeAge) || null;

  if (fullName.length < 3) return fail("Enter the owner's full name as on RC.");
  if (!PHONE_RE.test(phone)) return fail("Enter a valid 10-digit mobile number.");
  if (email && !EMAIL_RE.test(email)) return fail("Enter a valid email address.");
  if (address.length < 10) return fail("Enter the full communication address.");
  if (!PINCODE_RE.test(pincode)) return fail("Enter a valid 6-digit pincode.");

  const registrationNumber = normalizeReg(vehicle.registrationNumber);
  const chassisNumber = str(vehicle.chassisNumber, 25).toUpperCase();
  const engineNumber = str(vehicle.engineNumber, 25).toUpperCase();
  if (quoteInput.scenario !== "new" && !REG_RE.test(registrationNumber)) {
    return fail("Enter a valid registration number (e.g. DL01AB1234 or 22BH1234AA).");
  }
  if (chassisNumber && chassisNumber.length < 6) return fail("Chassis number looks too short.");
  if (quoteInput.scenario === "new" && chassisNumber.length < 6) {
    return fail("Chassis number (from the dealer invoice) is required for a new vehicle policy.");
  }

  const assessment = assessScenario(quoteInput);
  if (quoteInput.planType !== "third_party" && !quoteInput.hasOtherPaCover && !nomineeName) {
    return fail("Add a nominee for the compulsory personal-accident cover.");
  }
  if (quoteInput.planType === "own_damage" && !assessment.ownDamageAllowed) {
    return fail(assessment.ownDamageReason ?? "Standalone own-damage cover is not allowed for this vehicle.");
  }
  if (!body.consent) return fail("Please accept the declaration to continue.");

  const quote = computeInsurerQuote(quoteInput, insurer, assessment);

  const previousPolicy = (body.previousPolicy ?? {}) as Record<string, unknown>;
  const now = new Date().toISOString();
  const metadata = {
    flow: "motor_v2",
    reference: `MCI-${Date.now().toString(36).toUpperCase()}`,
    insurerSlug: insurer.slug,
    insurerName: insurer.name,
    planType: quoteInput.planType,
    planLabel: motorPlanLabel(quoteInput.planType, quoteInput.scenario, quoteInput.vehicleType),
    scenario: quoteInput.scenario,
    quoteInput,
    quote,
    assessment: {
      ncbPercent: assessment.ncbPercent,
      ncbReason: assessment.ncbReason,
      inspectionRequired: assessment.inspectionRequired,
      inspectionReason: assessment.inspectionReason,
      tpTermYears: assessment.tpTermYears,
      ageYears: assessment.ageYears,
      documents: assessment.documents,
    },
    owner: { fullName, phone, email, address, pincode, dob, nomineeName, nomineeRelation, nomineeAge },
    vehicle: {
      registrationNumber: registrationNumber || null,
      chassisNumber: chassisNumber || null,
      engineNumber: engineNumber || null,
      make: quoteInput.make,
      model: quoteInput.model,
      variant: str(vehicle.variant, 80) || null,
      registrationMonth: quoteInput.scenario === "new" ? null : quoteInput.registrationMonth,
      hypothecation: str(vehicle.hypothecation, 80) || null,
    },
    previousPolicy: {
      insurer: str(previousPolicy.insurer, 80) || null,
      policyNumber: str(previousPolicy.policyNumber, 40) || null,
      expiryDate: str(previousPolicy.expiryDate, 10) || null,
    },
    documents: cleanDocs(body.documents),
    timeline: [{ status: "submitted", at: now, note: "Application submitted from MotorCart" }],
  };

  const app = await prisma.insuranceApplication.create({
    data: {
      userId: auth.sub,
      provider: insurer.name,
      premium: new Prisma.Decimal(quote.totalPremium),
      status: "submitted",
      metadata: metadata as unknown as Prisma.InputJsonValue,
    },
  });

  const label = `${quoteInput.make} ${quoteInput.model} · ${insurer.shortName}`;
  await notifyUsers(
    await deskUserIds(),
    "New motor insurance application",
    `${label} — ₹${quote.totalPremium.toLocaleString("en-IN")} (${metadata.planLabel})`,
    { applicationId: app.id, link: "/dashboard/insurance" },
  );
  await notifyUsers(
    [auth.sub],
    "Insurance application received",
    `${metadata.reference}: ${label}. Our insurance desk will confirm the final premium${assessment.inspectionRequired ? " and schedule inspection" : ""}.`,
    { applicationId: app.id, link: "/dashboard/customer/insurance" },
  );

  return { ok: true, data: serializeApplication(app) };
}

export async function listMyInsuranceApplications(userId: string) {
  const rows = await prisma.insuranceApplication.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(serializeApplication);
}

export async function listDeskInsuranceApplications(status?: string | null) {
  const rows = await prisma.insuranceApplication.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { email: true, phone: true } } },
  });
  return rows.map((r) => ({
    ...serializeApplication(r),
    userEmail: r.user?.email ?? null,
    userPhone: r.user?.phone ?? null,
  }));
}

export async function getInsuranceApplication(auth: JwtPayload, id: string): Promise<DeskResult> {
  const row = await prisma.insuranceApplication.findUnique({ where: { id } });
  if (!row) return fail("Application not found", 404);
  if (row.userId !== auth.sub && !INSURANCE_DESK_ROLES.has(auth.role)) return fail("Forbidden", 403);
  return { ok: true, data: serializeApplication(row) };
}

export interface ApplicationUpdate {
  status?: string;
  note?: string;
  finalPremium?: number;
  paymentLink?: string;
  inspectionLink?: string;
  policyNumber?: string;
  policyStart?: string;
  policyEnd?: string;
  policyDocumentUrl?: string;
}

export async function updateInsuranceApplication(
  auth: JwtPayload,
  id: string,
  update: ApplicationUpdate,
): Promise<DeskResult> {
  const row = await prisma.insuranceApplication.findUnique({ where: { id } });
  if (!row) return fail("Application not found", 404);
  const meta = asMeta(row.metadata);
  const isDesk = INSURANCE_DESK_ROLES.has(auth.role);

  // Customer can only cancel their own open application.
  if (!isDesk) {
    if (row.userId !== auth.sub) return fail("Forbidden", 403);
    if (update.status !== "cancelled") return fail("You can only cancel your application.", 403);
    if (["issued", "rejected", "cancelled"].includes(row.status)) return fail("Application is already closed.");
    const updated = await prisma.insuranceApplication.update({
      where: { id },
      data: {
        status: "cancelled",
        metadata: {
          ...meta,
          timeline: pushTimeline(meta, { status: "cancelled", at: new Date().toISOString(), note: "Cancelled by customer" }),
        } as Prisma.InputJsonValue,
      },
    });
    return { ok: true, data: serializeApplication(updated) };
  }

  const status = update.status ?? row.status;
  if (!(INSURANCE_APPLICATION_STATUSES as readonly string[]).includes(status)) return fail("Invalid status");
  if (row.status === "issued" && status !== "issued") return fail("Issued policies cannot be moved back.");

  const nextMeta: Record<string, unknown> = { ...meta };
  let premium = row.premium;
  if (update.finalPremium != null) {
    const fp = Number(update.finalPremium);
    if (!Number.isFinite(fp) || fp <= 0 || fp > 10000000) return fail("Invalid final premium");
    premium = new Prisma.Decimal(Math.round(fp));
    nextMeta.finalPremium = Math.round(fp);
  }
  const link = (v?: string) => (v && /^https:\/\//.test(v.trim()) ? v.trim().slice(0, 500) : undefined);
  if (update.paymentLink !== undefined) nextMeta.paymentLink = link(update.paymentLink) ?? null;
  if (update.inspectionLink !== undefined) nextMeta.inspectionLink = link(update.inspectionLink) ?? null;
  if (update.policyDocumentUrl !== undefined) {
    const u = str(update.policyDocumentUrl, 500);
    nextMeta.policyDocumentUrl = u.startsWith("/uploads/") || u.startsWith("https://") ? u : null;
  }

  if (status === "payment_pending" && !nextMeta.paymentLink) {
    return fail("Add the insurer's payment link before moving to payment pending.");
  }

  let walletId: string | null = null;
  if (status === "issued" && row.status !== "issued") {
    const policyNumber = str(update.policyNumber, 40);
    const start = update.policyStart ? new Date(update.policyStart) : null;
    const end = update.policyEnd ? new Date(update.policyEnd) : null;
    if (!policyNumber) return fail("Policy number is required to mark as issued.");
    if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime()) || end <= start) {
      return fail("Valid policy start and end dates are required.");
    }
    nextMeta.policyNumber = policyNumber;
    nextMeta.policyStart = start.toISOString();
    nextMeta.policyEnd = end.toISOString();
    const vehicle = asMeta(meta.vehicle as Prisma.JsonValue);
    const wallet = await prisma.insuranceWallet.create({
      data: {
        userId: row.userId,
        insurerName: String(meta.insurerName ?? row.provider ?? "Insurer"),
        policyNumber,
        policyEnd: end,
        status: "active",
        metadata: {
          applicationId: row.id,
          planLabel: meta.planLabel ?? null,
          registrationNumber: vehicle.registrationNumber ?? null,
          vehicle: `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim(),
          policyStart: start.toISOString(),
          premium: premium == null ? null : Number(premium),
          policyDocumentUrl: nextMeta.policyDocumentUrl ?? null,
        } as Prisma.InputJsonValue,
      },
    });
    walletId = wallet.id;
    nextMeta.walletId = walletId;
  }

  const note = str(update.note, 500);
  if (status !== row.status || note) {
    nextMeta.timeline = pushTimeline(meta, {
      status,
      at: new Date().toISOString(),
      note: note || undefined,
      by: auth.role,
    });
  }

  const updated = await prisma.insuranceApplication.update({
    where: { id },
    data: { status, premium, metadata: nextMeta as Prisma.InputJsonValue },
  });

  if (status !== row.status || note) {
    const ref = String(meta.reference ?? row.id.slice(0, 8));
    let body = `${ref}: ${applicationStatusLabel(status)}`;
    if (status === "payment_pending") body += " — pay securely on the insurer's link in My insurance.";
    if (status === "inspection_pending") body += " — complete the vehicle inspection to proceed.";
    if (status === "issued") body += ` — policy ${String(nextMeta.policyNumber)} is active.`;
    if (note) body += ` · ${note}`;
    await notifyUsers([row.userId], "Insurance application update", body, {
      applicationId: row.id,
      link: "/dashboard/customer/insurance",
    });
  }

  return { ok: true, data: serializeApplication(updated) };
}

/* ------------------------------------------------------------------ */
/* Claim intimation                                                     */
/* ------------------------------------------------------------------ */

const INCIDENT_TYPES = new Set(["accident", "theft", "fire", "flood", "natural_calamity", "vandalism", "glass", "third_party"]);

function serializeClaim(row: InsuranceClaimRequest) {
  return {
    ...row,
    statusLabel: claimStatusLabel(row.status),
    approvedAmount: row.approvedAmount == null ? null : Number(row.approvedAmount),
    incidentAt: row.incidentAt.toISOString(),
    surveyAt: row.surveyAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createClaimRequest(auth: JwtPayload, body: Record<string, unknown>): Promise<DeskResult> {
  const insurerName = str(body.insurerName, 100);
  const policyNumber = str(body.policyNumber, 40);
  const vehicleReg = normalizeReg(body.vehicleReg);
  const incidentType = str(body.incidentType, 30);
  const incidentAt = new Date(str(body.incidentAt, 30));
  const location = str(body.location, 200);
  const description = str(body.description, 2000);
  const claimMode = body.claimMode === "reimbursement" ? "reimbursement" : "cashless";
  const contactPhone = str(body.contactPhone, 15).replace(/\D/g, "").slice(-10);
  const firNumber = str(body.firNumber, 40) || null;

  if (!insurerName) return fail("Select your insurer.");
  if (policyNumber.length < 5) return fail("Enter your policy number.");
  if (!REG_RE.test(vehicleReg)) return fail("Enter a valid vehicle registration number.");
  if (!INCIDENT_TYPES.has(incidentType)) return fail("Select what happened.");
  if (Number.isNaN(incidentAt.getTime()) || incidentAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return fail("Enter a valid incident date & time.");
  }
  if (location.length < 3) return fail("Enter where it happened.");
  if (description.length < 15) return fail("Describe the incident in a few lines.");
  if (!PHONE_RE.test(contactPhone)) return fail("Enter a valid 10-digit contact number.");
  if (incidentType === "theft" && !firNumber) return fail("An FIR number is mandatory for theft claims.");

  let applicationId: string | null = str(body.applicationId, 60) || null;
  if (applicationId) {
    const app = await prisma.insuranceApplication.findFirst({ where: { id: applicationId, userId: auth.sub } });
    if (!app) applicationId = null;
  }

  const row = await prisma.insuranceClaimRequest.create({
    data: {
      userId: auth.sub,
      applicationId,
      insurerName,
      policyNumber,
      vehicleReg,
      vehicleType: body.vehicleType === "bike" ? "bike" : "car",
      incidentType,
      incidentAt,
      location,
      description,
      claimMode,
      garage: str(body.garage, 150) || null,
      firNumber,
      contactPhone,
      documents: cleanDocs(body.documents) as Prisma.InputJsonValue,
      status: "intimated",
      notes: [{ status: "intimated", at: new Date().toISOString(), note: "Claim intimated via MotorCart" }],
    },
  });

  const insurer = findInsurer(insurerName) ?? MOTOR_INSURERS.find((i) => insurerName.includes(i.shortName));
  await notifyUsers(
    await deskUserIds(),
    "New motor claim intimation",
    `${vehicleReg} · ${insurerName} · ${incidentType.replace(/_/g, " ")}`,
    { claimRequestId: row.id, link: "/dashboard/insurance" },
  );
  await notifyUsers(
    [auth.sub],
    "Claim intimation received",
    `Our claims desk will register this with ${insurer?.shortName ?? insurerName}${insurer ? ` (helpline ${insurer.claimHelpline})` : ""} and update you here.`,
    { claimRequestId: row.id, link: "/insurance/claims" },
  );

  return { ok: true, data: serializeClaim(row) };
}

export async function listMyClaimRequests(userId: string) {
  const rows = await prisma.insuranceClaimRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(serializeClaim);
}

export async function listDeskClaimRequests(status?: string | null) {
  const rows = await prisma.insuranceClaimRequest.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(serializeClaim);
}

export interface ClaimUpdate {
  status?: string;
  note?: string;
  claimNumber?: string;
  surveyAt?: string;
  approvedAmount?: number;
}

export async function updateClaimRequest(auth: JwtPayload, id: string, update: ClaimUpdate): Promise<DeskResult> {
  if (!INSURANCE_DESK_ROLES.has(auth.role)) return fail("Forbidden", 403);
  const row = await prisma.insuranceClaimRequest.findUnique({ where: { id } });
  if (!row) return fail("Claim not found", 404);
  const status = (update.status ?? row.status) as InsuranceClaimRequestStatus;
  if (!(INSURANCE_CLAIM_STATUSES as readonly string[]).includes(status)) return fail("Invalid status");

  const data: Prisma.InsuranceClaimRequestUpdateInput = { status };
  if (update.claimNumber !== undefined) data.claimNumber = str(update.claimNumber, 40) || null;
  if (update.surveyAt) {
    const d = new Date(update.surveyAt);
    if (Number.isNaN(d.getTime())) return fail("Invalid survey date");
    data.surveyAt = d;
  }
  if (update.approvedAmount != null) {
    const amt = Number(update.approvedAmount);
    if (!Number.isFinite(amt) || amt < 0) return fail("Invalid approved amount");
    data.approvedAmount = new Prisma.Decimal(Math.round(amt));
  }
  if (status === "registered" && !(data.claimNumber ?? row.claimNumber)) {
    return fail("Add the insurer's claim number when registering the claim.");
  }
  const note = str(update.note, 500);
  const prevNotes = Array.isArray(row.notes) ? (row.notes as TimelineEntry[]) : [];
  if (status !== row.status || note) {
    data.notes = [...prevNotes, { status, at: new Date().toISOString(), note: note || undefined, by: auth.role }].slice(
      -40,
    ) as Prisma.InputJsonValue;
  }
  const updated = await prisma.insuranceClaimRequest.update({ where: { id }, data });

  if (status !== row.status || note) {
    let body = `${row.vehicleReg}: ${claimStatusLabel(status)}`;
    if (updated.claimNumber) body += ` · Claim no. ${updated.claimNumber}`;
    if (note) body += ` · ${note}`;
    await notifyUsers([row.userId], "Claim update", body, { claimRequestId: row.id, link: "/insurance/claims" });
  }
  return { ok: true, data: serializeClaim(updated) };
}

export function isApplicationStatus(s: string): s is InsuranceApplicationStatus {
  return (INSURANCE_APPLICATION_STATUSES as readonly string[]).includes(s);
}
