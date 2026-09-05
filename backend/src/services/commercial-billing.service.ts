import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit, organizationForDealer, requireDealerContext } from "@/lib/sales-os/access";
import { isPartnerPlanSlug } from "@/lib/organization/entitlements";
import { CommercialError } from "@/lib/commercial/errors";
import {
  PAYMENT_PURPOSES,
  SETTING_SELLER,
  SETTING_TAX,
} from "@/lib/commercial/constants";
import { calculateInvoiceTotals, type TaxRates } from "@/lib/commercial/tax";
import { getPaymentProvider } from "@/lib/commercial/payment-provider";
import { isPaymentGatewayEnabled } from "@/lib/commercial/flags";
import { assertAdmin, isAdminRole, type CommercialActor } from "@/lib/commercial/http";

function json(v: unknown): Prisma.InputJsonValue {
  return v as Prisma.InputJsonValue;
}

function money(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) throw new CommercialError("Invalid amount", 400, "INVALID_AMOUNT");
  return Math.round(v * 100) / 100;
}

export async function requirePartnerOrg(actor: CommercialActor, organizationId?: string | null) {
  if (isAdminRole(actor.role) && organizationId) {
    const org = await prisma.organization.findFirst({ where: { id: organizationId, deletedAt: null } });
    if (!org) throw new CommercialError("Organization not found", 404, "ORG_NOT_FOUND");
    return org;
  }
  const dealer = await requireDealerContext(actor);
  const org = await organizationForDealer(dealer.id);
  if (!org) throw new CommercialError("Organization not found", 404, "ORG_NOT_FOUND");
  if (organizationId && organizationId !== org.id) throw new CommercialError("Forbidden", 403, "CROSS_TENANT");
  return org;
}

export async function upsertSetting(actor: CommercialActor, key: string, value: unknown) {
  assertAdmin(actor);
  const row = await prisma.commercialSetting.upsert({
    where: { key },
    create: { key, value: json(value), updatedBy: actor.userId },
    update: { value: json(value), updatedBy: actor.userId },
  });
  await writeAudit(actor, "commercial.setting", { key });
  return row;
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const row = await prisma.commercialSetting.findUnique({ where: { key } });
  return (row?.value as T) ?? null;
}

export async function listManagedPlans() {
  return prisma.subscriptionPlan.findMany({ orderBy: { createdAt: "asc" } });
}

export async function upsertManagedPlan(
  actor: CommercialActor,
  input: {
    id?: string;
    name: string;
    slug: string;
    price: number;
    currency?: string;
    billingCycle?: string;
    status?: string;
    includedFeatures?: string[];
    includedLimits?: Record<string, unknown>;
    includedLeadCredits?: number;
    trialDays?: number;
    isActive?: boolean;
  },
) {
  assertAdmin(actor);
  const data = {
    name: input.name,
    slug: input.slug,
    price: money(input.price),
    currency: input.currency ?? "INR",
    billingCycle: input.billingCycle ?? "monthly",
    status: input.status ?? "ACTIVE",
    includedFeatures: json(input.includedFeatures ?? []),
    includedLimits: json(input.includedLimits ?? {}),
    includedLeadCredits: input.includedLeadCredits ?? 0,
    trialDays: input.trialDays ?? 0,
    isActive: input.isActive ?? true,
    features: json(input.includedFeatures ?? []),
  };
  const plan = input.id
    ? await prisma.subscriptionPlan.update({ where: { id: input.id }, data })
    : await prisma.subscriptionPlan.create({ data });
  await writeAudit(actor, "commercial.plan", { planId: plan.id, slug: plan.slug });
  return plan;
}

export async function assignSubscription(
  actor: CommercialActor,
  input: { organizationId: string; planId: string; billingCycle?: string; trial?: boolean },
) {
  assertAdmin(actor);
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: input.planId } });
  if (!plan || !plan.isActive) throw new CommercialError("Plan not found", 404, "PLAN_NOT_FOUND");
  const org = await prisma.organization.findFirst({ where: { id: input.organizationId, deletedAt: null } });
  if (!org) throw new CommercialError("Organization not found", 404, "ORG_NOT_FOUND");
  const now = new Date();
  const trial = Boolean(input.trial && plan.trialDays > 0);
  const status = trial ? "TRIAL" : "ACTIVE";
  const trialEndsAt = trial ? new Date(now.getTime() + plan.trialDays * 86400000) : null;
  const sub = await prisma.organizationSubscription.create({
    data: {
      organizationId: org.id,
      planId: plan.id,
      billingCycle: input.billingCycle ?? plan.billingCycle,
      status,
      startsAt: now,
      trialEndsAt,
      metadata: json({}),
    },
  });
  if (isPartnerPlanSlug(plan.slug)) {
    await prisma.organization.update({ where: { id: org.id }, data: { planSlug: plan.slug } });
  }
  await writeAudit(actor, "commercial.subscription", { organizationId: org.id, planId: plan.id, status });
  return sub;
}

export async function changeSubscriptionStatus(
  actor: CommercialActor,
  subscriptionId: string,
  status: string,
) {
  assertAdmin(actor);
  const allowed = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"];
  if (!allowed.includes(status)) throw new CommercialError("Invalid status", 400, "INVALID_STATUS");
  const sub = await prisma.organizationSubscription.update({
    where: { id: subscriptionId },
    data: {
      status,
      cancelledAt: status === "CANCELLED" ? new Date() : undefined,
      endsAt: status === "EXPIRED" || status === "CANCELLED" ? new Date() : undefined,
    },
  });
  await writeAudit(actor, "commercial.subscription.status", { subscriptionId, status });
  return sub;
}

export async function listOrganizationSubscriptions(actor: CommercialActor, organizationId?: string) {
  const org = await requirePartnerOrg(actor, organizationId);
  return prisma.organizationSubscription.findMany({
    where: { organizationId: org.id },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function commercialEntitlements(actor: CommercialActor, organizationId?: string) {
  const org = await requirePartnerOrg(actor, organizationId);
  const sub = await prisma.organizationSubscription.findFirst({
    where: { organizationId: org.id, status: { in: ["TRIAL", "ACTIVE"] } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  const overrides = await prisma.organizationEntitlement.findMany({ where: { organizationId: org.id } });
  const planFeatures = Array.isArray(sub?.plan.includedFeatures) ? (sub!.plan.includedFeatures as string[]) : [];
  const keys = [
    "inventory",
    "inventory_bulk_upload",
    "new_vehicle_inventory",
    "used_vehicle_inventory",
    "crm",
    "lead_management",
    "lead_board",
    "paid_leads",
    "quotation",
    "test_drive",
    "marketing",
    "analytics",
    "calls",
    "whatsapp",
    "dialer",
    "ai_calling",
    "finance_leads",
    "insurance_leads",
    "service_leads",
    "parts_leads",
    "company_profile",
    "community",
    "team",
    "branches",
    "api_access",
  ];
  return keys.map((key) => {
    const lockedPhase = key === "dialer" || key === "ai_calling";
    const override = overrides.find((o) => o.featureKey === key);
    const inPlan = Boolean(sub && (sub.status === "ACTIVE" || sub.status === "TRIAL") && planFeatures.includes(key));
    const active = lockedPhase ? false : override ? override.granted : inPlan;
    return {
      key,
      state: active ? "ACTIVE" : inPlan || override ? "AVAILABLE" : "LOCKED",
      upgrade: !active,
      locked: !active,
    };
  });
}

export async function createPaymentRecord(
  actor: CommercialActor,
  input: {
    organizationId?: string;
    purpose: string;
    amount: number;
    currency?: string;
    referenceType?: string;
    referenceId?: string;
  },
) {
  if (!PAYMENT_PURPOSES.includes(input.purpose as (typeof PAYMENT_PURPOSES)[number])) {
    throw new CommercialError("Unsupported payment purpose", 400, "INVALID_PURPOSE");
  }
  const amount = money(input.amount);
  if (!(amount > 0)) throw new CommercialError("Amount must be positive", 400, "INVALID_AMOUNT");
  const org = input.organizationId || !isAdminRole(actor.role) ? await requirePartnerOrg(actor, input.organizationId) : null;
  const provider = getPaymentProvider();
  const order = await provider.createOrder({
    amount,
    currency: input.currency ?? "INR",
    purpose: input.purpose,
    referenceId: input.referenceId,
  });
  const payment = await prisma.commercialPayment.create({
    data: {
      organizationId: org?.id,
      userId: actor.userId,
      purpose: input.purpose,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      amount,
      currency: input.currency ?? "INR",
      status: "CREATED",
      provider: provider.name,
      providerRef: order.providerRef,
      metadata: json({ clientStatusIgnored: true }),
    },
  });
  await writeAudit(actor, "commercial.payment.create", { paymentId: payment.id, purpose: input.purpose });
  return { payment, gatewayEnabled: isPaymentGatewayEnabled() };
}

export async function rejectClientPaidStatus(status?: string) {
  if (status && ["PAID", "SUCCESS", "CAPTURED"].includes(status.toUpperCase())) {
    throw new CommercialError("Client-set payment status is not accepted", 403, "FORGED_PAYMENT_STATUS");
  }
}

export async function recordManualPayment(actor: CommercialActor, paymentId: string) {
  assertAdmin(actor);
  return prisma.$transaction(async (tx) => {
    const payment = await tx.commercialPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new CommercialError("Payment not found", 404, "PAYMENT_NOT_FOUND");
    if (payment.status === "PAID") return payment;
    const updated = await tx.commercialPayment.update({
      where: { id: paymentId },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (updated.purpose === "LEAD_CREDITS" && updated.organizationId) {
      await applyLeadCreditFromPaymentTx(tx, actor.userId, updated.id);
    }
    return updated;
  }).then(async (payment) => {
    await writeAudit(actor, "commercial.payment.manual", { paymentId });
    return payment;
  });
}

async function applyLeadCreditFromPaymentTx(
  tx: Prisma.TransactionClient,
  actorUserId: string,
  paymentId: string,
) {
  const existing = await tx.leadCreditLedger.findUnique({ where: { paymentId } });
  if (existing) return existing;
  const payment = await tx.commercialPayment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "PAID") throw new CommercialError("Payment is not confirmed", 400, "PAYMENT_NOT_PAID");
  const credits = Number((payment.metadata as { credits?: number }).credits ?? payment.amount);
  if (!Number.isInteger(credits) || credits <= 0) {
    throw new CommercialError("Lead credit quantity missing on payment", 400, "CREDITS_QTY");
  }
  const org = payment.organizationId
    ? await tx.organization.findUnique({ where: { id: payment.organizationId } })
    : null;
  if (!org?.legacyDealerId) throw new CommercialError("Dealer mapping missing for credits", 400, "NO_DEALER");
  const account = await tx.leadCreditAccount.upsert({
    where: { dealerId: org.legacyDealerId },
    create: { dealerId: org.legacyDealerId, organizationId: org.id, balance: 0 },
    update: {},
  });
  const next = account.balance + credits;
  if (next < 0) throw new CommercialError("Negative balance is not allowed", 400, "NEGATIVE_BALANCE");
  await tx.leadCreditAccount.update({ where: { id: account.id }, data: { balance: next } });
  return tx.leadCreditLedger.create({
    data: {
      accountId: account.id,
      entryType: "CREDIT",
      amount: credits,
      balanceAfter: next,
      reason: "payment_topup",
      actorUserId,
      paymentId,
      metadata: json({ paymentId }),
    },
  });
}

export async function createLeadCreditPurchase(
  actor: CommercialActor,
  input: { organizationId?: string; credits: number; amount: number },
) {
  const org = await requirePartnerOrg(actor, input.organizationId);
  const credits = Number(input.credits);
  if (!Number.isInteger(credits) || credits <= 0) throw new CommercialError("Invalid credit quantity", 400, "INVALID_AMOUNT");
  const { payment } = await createPaymentRecord(actor, {
    organizationId: org.id,
    purpose: "LEAD_CREDITS",
    amount: input.amount,
    referenceType: "lead_credits",
    referenceId: org.id,
  });
  await prisma.commercialPayment.update({
    where: { id: payment.id },
    data: { metadata: json({ credits, clientStatusIgnored: true }) },
  });
  return prisma.commercialPayment.findUniqueOrThrow({ where: { id: payment.id } });
}

export async function processPaymentWebhook(rawBody: string, signature: string | null) {
  const provider = getPaymentProvider();
  const event = await provider.processWebhook(rawBody, signature);
  return prisma.$transaction(async (tx) => {
    const dup = await tx.paymentEvent.findUnique({
      where: { provider_providerEventId: { provider: provider.name, providerEventId: event.eventId } },
    });
    if (dup) return { idempotent: true, event: dup };
    const payment = await tx.commercialPayment.findUnique({ where: { providerRef: event.providerRef } });
    if (!payment) throw new CommercialError("Payment not found", 404, "PAYMENT_NOT_FOUND");
    const saved = await tx.paymentEvent.create({
      data: {
        paymentId: payment.id,
        provider: provider.name,
        providerEventId: event.eventId,
        eventType: event.eventType,
        payload: json(event.payload),
      },
    });
    if (event.status === "PAID" && payment.status !== "PAID") {
      await tx.commercialPayment.update({
        where: { id: payment.id },
        data: { status: "PAID", paidAt: new Date() },
      });
      if (payment.purpose === "LEAD_CREDITS") {
        await applyLeadCreditFromPaymentTx(tx, payment.userId ?? "system", payment.id);
      }
    }
    return { idempotent: false, event: saved };
  });
}

export async function createDraftInvoice(
  actor: CommercialActor,
  input: {
    organizationId: string;
    paymentId?: string;
    kind?: string;
    lines: Array<{ description: string; hsnSac?: string; quantity?: number; unitPrice: number }>;
    intraState: boolean;
    buyerGstin?: string;
    placeOfSupply?: string;
    billingAddress?: Record<string, unknown>;
  },
) {
  assertAdmin(actor);
  if (input.paymentId) {
    const existing = await prisma.commercialInvoice.findFirst({
      where: { organizationId: input.organizationId, paymentId: input.paymentId, kind: input.kind ?? "MOTORCART_INVOICE" },
    });
    if (existing) throw new CommercialError("Invoice already exists for this payment", 409, "DUPLICATE_INVOICE");
  }
  const seller = await getSetting<{ legalName?: string; gstin?: string }>(SETTING_SELLER);
  const rates = await getSetting<TaxRates>(SETTING_TAX);
  if (!rates) throw new CommercialError("Tax rates are not configured", 400, "TAX_RATE_NOT_CONFIGURED");
  const lineTaxables = input.lines.map((l) => money((l.quantity ?? 1) * l.unitPrice));
  const totals = calculateInvoiceTotals(lineTaxables, rates, input.intraState);
  const invoiceNumber = `DRAFT-${Date.now()}`;
  return prisma.commercialInvoice.create({
    data: {
      invoiceNumber,
      kind: input.kind ?? "MOTORCART_INVOICE",
      organizationId: input.organizationId,
      paymentId: input.paymentId,
      invoiceDate: new Date(),
      sellerLegalName: seller?.legalName,
      sellerGstin: seller?.gstin,
      buyerGstin: input.buyerGstin,
      billingAddress: json(input.billingAddress ?? {}),
      placeOfSupply: input.placeOfSupply,
      taxableValue: totals.taxable,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      otherCharges: totals.otherCharges,
      total: totals.total,
      status: "DRAFT",
      lines: {
        create: input.lines.map((l, i) => ({
          description: l.description,
          hsnSac: l.hsnSac,
          quantity: l.quantity ?? 1,
          unitPrice: money(l.unitPrice),
          taxableValue: lineTaxables[i]!,
        })),
      },
    },
    include: { lines: true },
  });
}

export async function issueInvoice(actor: CommercialActor, invoiceId: string) {
  assertAdmin(actor);
  const seller = await getSetting<{ legalName?: string; gstin?: string }>(SETTING_SELLER);
  if (!seller?.legalName) throw new CommercialError("Seller legal entity is not configured", 400, "SELLER_NOT_CONFIGURED");
  const invoice = await prisma.commercialInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new CommercialError("Invoice not found", 404, "INVOICE_NOT_FOUND");
  if (invoice.status === "ISSUED") throw new CommercialError("Invoice already issued", 409, "DUPLICATE_INVOICE");
  const year = new Date().getFullYear();
  const count = await prisma.commercialInvoice.count({ where: { status: "ISSUED" } });
  const updated = await prisma.commercialInvoice.update({
    where: { id: invoiceId },
    data: {
      status: "ISSUED",
      issuedAt: new Date(),
      invoiceNumber: `MC-INV-${year}-${String(count + 1).padStart(5, "0")}`,
      sellerLegalName: seller.legalName,
      sellerGstin: seller.gstin ?? invoice.sellerGstin,
    },
    include: { lines: true },
  });
  await writeAudit(actor, "commercial.invoice.issue", { invoiceId });
  return updated;
}

export async function voidInvoice(actor: CommercialActor, invoiceId: string) {
  assertAdmin(actor);
  const invoice = await prisma.commercialInvoice.update({
    where: { id: invoiceId },
    data: { status: "VOID", voidedAt: new Date() },
  });
  await writeAudit(actor, "commercial.invoice.void", { invoiceId });
  return invoice;
}

export async function listInvoices(actor: CommercialActor, organizationId?: string) {
  if (isAdminRole(actor.role) && !organizationId) {
    return prisma.commercialInvoice.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { lines: true } });
  }
  const org = await requirePartnerOrg(actor, organizationId);
  return prisma.commercialInvoice.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    include: { lines: true },
  });
}

export async function createPromotionOrder(
  actor: CommercialActor,
  input: { organizationId?: string; productType: string; durationDays: number; price: number },
) {
  const org = await requirePartnerOrg(actor, input.organizationId);
  if (!(input.durationDays > 0)) throw new CommercialError("Invalid duration", 400, "INVALID_DURATION");
  const order = await prisma.promotionOrder.create({
    data: {
      organizationId: org.id,
      productType: input.productType,
      durationDays: input.durationDays,
      price: money(input.price),
      status: "PENDING_PAYMENT",
    },
  });
  await writeAudit(actor, "commercial.promotion.create", { orderId: order.id });
  return order;
}

export async function revenueDashboard(actor: CommercialActor) {
  assertAdmin(actor);
  const paid = await prisma.commercialPayment.findMany({ where: { status: "PAID" } });
  const sum = (purpose: string) =>
    paid.filter((p) => p.purpose === purpose).reduce((s, p) => s + Number(p.amount), 0);
  const payouts = await prisma.partnerPayoutEntry.findMany();
  const recon = await prisma.reconciliationEntry.findMany({ where: { status: { in: ["MISMATCH", "PARTIAL", "UNMATCHED"] } } });
  return {
    subscriptionRevenue: sum("SUBSCRIPTION"),
    leadCreditRevenue: sum("LEAD_CREDITS"),
    featuredListingRevenue: sum("FEATURED_LISTING") + sum("MARKETING"),
    financeExpectedPayout: payouts.filter((p) => p.sourceType === "FINANCE_COMMISSION").reduce((s, p) => s + Number(p.amount), 0),
    financeRealizedPayout: payouts.filter((p) => p.sourceType === "IMPORT_ROW" && p.status === "PAID").reduce((s, p) => s + Number(p.amount), 0),
    insuranceExpected: 0,
    insuranceRealized: 0,
    partnerPayable: payouts.filter((p) => ["APPROVED", "PENDING", "IN_PROGRESS"].includes(p.status)).reduce((s, p) => s + Number(p.amount), 0),
    settled: payouts.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.amount), 0),
    outstanding: payouts.filter((p) => !["PAID", "REJECTED", "REVERSED"].includes(p.status)).reduce((s, p) => s + Number(p.amount), 0),
    mismatchCount: recon.length,
  };
}

export async function listPayments(actor: CommercialActor, organizationId?: string) {
  if (isAdminRole(actor.role) && !organizationId) {
    return prisma.commercialPayment.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  }
  const org = await requirePartnerOrg(actor, organizationId);
  return prisma.commercialPayment.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" } });
}
