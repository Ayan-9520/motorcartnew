import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/organization/permissions";
import { QuotationError } from "@/lib/quotations/errors";
import {
  ADMIN_ROLES,
  DEALER_QUOTATION_ROLES,
  type QuotationActor,
} from "@/lib/quotations/http";
import {
  calculateQuotationTotals,
  defaultValidityWindow,
  generateQuotationNumber,
  isExpired,
  money,
  type PricingComponents,
} from "@/lib/quotations/pricing";
import { emptySnapshot, serializeQuotation, type QuotationSnapshot } from "@/lib/quotations/serialize";
import type { Prisma, Quotation, QuotationStatus } from "@prisma/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PIN_RE = /^[1-9][0-9]{5}$/;

const CUSTOMER_VISIBLE: QuotationStatus[] = ["issued", "accepted", "expired", "cancelled"];

type DealerScope = { dealerIds: string[]; admin: boolean };

async function dealerScope(actor: QuotationActor): Promise<DealerScope> {
  if (ADMIN_ROLES.has(actor.role)) return { dealerIds: [], admin: true };

  const [owned, members, orgMembers] = await Promise.all([
    prisma.dealer.findMany({
      where: { ownerId: actor.userId, deletedAt: null },
      select: { id: true },
    }),
    prisma.dealerMember.findMany({
      where: { userId: actor.userId },
      select: { dealerId: true },
    }),
    prisma.organizationMember.findMany({
      where: { userId: actor.userId, status: "active" },
      include: { organization: { select: { legacyDealerId: true } } },
    }),
  ]);

  const ids = new Set<string>();
  for (const d of owned) ids.add(d.id);
  for (const m of members) ids.add(m.dealerId);
  for (const m of orgMembers) {
    if (m.organization.legacyDealerId) ids.add(m.organization.legacyDealerId);
  }
  return { dealerIds: [...ids], admin: false };
}

async function canWriteQuotations(actor: QuotationActor, dealerId: string): Promise<boolean> {
  if (ADMIN_ROLES.has(actor.role)) return true;
  const dealer = await prisma.dealer.findFirst({
    where: { id: dealerId, deletedAt: null },
    select: { ownerId: true },
  });
  if (!dealer) return false;
  if (dealer.ownerId === actor.userId) return true;
  const member = await prisma.dealerMember.findFirst({
    where: { dealerId, userId: actor.userId },
  });
  if (member) return true;
  const org = await prisma.organization.findFirst({
    where: { legacyDealerId: dealerId, deletedAt: null },
    include: {
      members: { where: { userId: actor.userId, status: "active" } },
    },
  });
  const orgMember = org?.members[0];
  if (!orgMember) return false;
  return hasOrganizationPermission(orgMember.role, "quotation.create", Array.isArray(orgMember.permissions) ? (orgMember.permissions as string[]) : []);
}

function requireDealerRole(actor: QuotationActor) {
  if (ADMIN_ROLES.has(actor.role) || DEALER_QUOTATION_ROLES.has(actor.role)) return;
  throw new QuotationError("Only dealers can manage quotations", 403, "FORBIDDEN");
}

async function uniqueNumber(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const n = generateQuotationNumber();
    const exists = await prisma.quotation.findUnique({ where: { quotationNumber: n } });
    if (!exists) return n;
  }
  return `MCQ-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function resolveOrganizationId(dealerId: string, clientOrgId: unknown): Promise<string | null> {
  const org = await prisma.organization.findFirst({
    where: { legacyDealerId: dealerId, deletedAt: null },
    select: { id: true },
  });
  const resolved = org?.id ?? null;
  if (clientOrgId != null && String(clientOrgId).trim()) {
    if (!resolved || String(clientOrgId) !== resolved) {
      throw new QuotationError("organizationId is not accepted from the client", 400, "FORGED_ORGANIZATION_ID");
    }
  }
  return resolved;
}

async function resolveCustomerUserId(
  dealerInput: Record<string, unknown>,
): Promise<string> {
  const direct = String(dealerInput.customerUserId ?? dealerInput.customer_user_id ?? "").trim();
  if (direct) {
    if (!UUID_RE.test(direct)) throw new QuotationError("Invalid customer", 400, "INVALID_CUSTOMER");
    const user = await prisma.user.findFirst({ where: { id: direct, deletedAt: null } });
    if (!user) throw new QuotationError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
    return user.id;
  }
  const phone = String(dealerInput.customerPhone ?? dealerInput.customer_phone ?? "").replace(/\D/g, "");
  const email = String(dealerInput.customerEmail ?? dealerInput.customer_email ?? "").trim().toLowerCase();
  if (phone.length >= 10) {
    const user = await prisma.user.findFirst({
      where: { deletedAt: null, phone: { endsWith: phone.slice(-10) } },
    });
    if (user) return user.id;
  }
  if (email) {
    const user = await prisma.user.findFirst({ where: { deletedAt: null, email } });
    if (user) return user.id;
  }
  throw new QuotationError("Customer must have a MotorCart account", 400, "CUSTOMER_REQUIRED");
}

function pricingFromBody(body: Record<string, unknown>): PricingComponents {
  return {
    exShowroomAmount: money(body.exShowroomAmount ?? body.ex_showroom_amount),
    rtoAmount: money(body.rtoAmount ?? body.rto_amount),
    insuranceAmount: money(body.insuranceAmount ?? body.insurance_amount),
    accessoriesAmount: money(body.accessoriesAmount ?? body.accessories_amount),
    financeAmount: money(body.financeAmount ?? body.finance_amount),
    exchangeAmount: money(body.exchangeAmount ?? body.exchange_amount),
    otherCharges: money(body.otherCharges ?? body.other_charges),
    discountAmount: money(body.discountAmount ?? body.discount_amount),
    taxAmount: money(body.taxAmount ?? body.tax_amount),
  };
}

async function buildSnapshot(input: {
  customerUserId: string;
  dealerId: string;
  organizationId: string | null;
  leadId: string | null;
  vehicleId: string | null;
  inventoryId: string | null;
}): Promise<QuotationSnapshot> {
  const [customer, dealer, organization, lead, vehicle, inventory] = await Promise.all([
    prisma.user.findFirst({
      where: { id: input.customerUserId },
      select: { id: true, fullName: true, phone: true, email: true },
    }),
    prisma.dealer.findFirst({
      where: { id: input.dealerId },
      select: { id: true, name: true, slug: true, city: true, state: true, phone: true, email: true, gstNumber: true, address: true },
    }),
    input.organizationId
      ? prisma.organization.findFirst({
          where: { id: input.organizationId },
          select: { id: true, name: true, displayName: true, slug: true },
        })
      : null,
    input.leadId
      ? prisma.lead.findFirst({
          where: { id: input.leadId },
          select: { id: true, name: true, phone: true, vehicleInterest: true },
        })
      : null,
    input.vehicleId
      ? prisma.vehicle.findFirst({
          where: { id: input.vehicleId },
          select: { id: true, title: true, brand: true, model: true, variant: true, year: true, slug: true },
        })
      : null,
    input.inventoryId
      ? prisma.newCarInventory.findFirst({
          where: { id: input.inventoryId },
          select: {
            id: true,
            brand: true,
            model: true,
            variant: true,
            year: true,
            fuelType: true,
            transmission: true,
            stockStatus: true,
            catalogVariantId: true,
          },
        })
      : null,
  ]);

  const snap = emptySnapshot();
  snap.customer = customer;
  snap.dealer = dealer;
  snap.organization = organization;
  snap.lead = lead;
  snap.vehicle = vehicle;
  snap.inventory = inventory;
  return snap;
}

async function assertInventoryForDealer(dealerId: string, inventoryId: string | null) {
  if (!inventoryId) return;
  if (!UUID_RE.test(inventoryId)) throw new QuotationError("Invalid inventory", 400, "INVALID_INVENTORY");
  const row = await prisma.newCarInventory.findFirst({ where: { id: inventoryId } });
  if (!row) throw new QuotationError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
  if (row.dealerId !== dealerId) throw new QuotationError("Inventory does not belong to this dealer", 403, "INVENTORY_FORBIDDEN");
}

async function assertVehicleForDealer(dealerId: string, vehicleId: string | null) {
  if (!vehicleId) return;
  if (!UUID_RE.test(vehicleId)) throw new QuotationError("Invalid vehicle", 400, "INVALID_VEHICLE");
  const row = await prisma.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
  if (!row) throw new QuotationError("Vehicle not found", 404, "VEHICLE_NOT_FOUND");
  if (row.dealerId && row.dealerId !== dealerId) {
    throw new QuotationError("Vehicle does not belong to this dealer", 403, "VEHICLE_FORBIDDEN");
  }
}

async function assertLeadForDealer(dealerId: string, leadId: string | null) {
  if (!leadId) return;
  if (!UUID_RE.test(leadId)) throw new QuotationError("Invalid lead", 400, "INVALID_LEAD");
  const row = await prisma.lead.findFirst({ where: { id: leadId } });
  if (!row) throw new QuotationError("Lead not found", 404, "LEAD_NOT_FOUND");
  if (row.dealerId !== dealerId) throw new QuotationError("Lead does not belong to this dealer", 403, "LEAD_FORBIDDEN");
}

function optionalId(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value);
  return s.trim() ? s : null;
}

function pincodeFrom(body: Record<string, unknown>, fallback: string | null): string | null {
  const raw = String(body.pincode ?? fallback ?? "").trim();
  if (!raw) return fallback;
  if (!PIN_RE.test(raw)) throw new QuotationError("Invalid pincode", 400, "INVALID_PINCODE");
  return raw;
}

async function persistExpiry(row: Quotation): Promise<Quotation> {
  if (!isExpired(row.status, row.validityEnd) || row.status === "expired") return row;
  return prisma.quotation.update({
    where: { id: row.id },
    data: { status: "expired" },
  });
}

export async function listQuotations(actor: QuotationActor) {
  if (DEALER_QUOTATION_ROLES.has(actor.role) || ADMIN_ROLES.has(actor.role)) {
    const scope = await dealerScope(actor);
    const where: Prisma.QuotationWhereInput = scope.admin ? {} : { dealerId: { in: scope.dealerIds } };
    if (!scope.admin && !scope.dealerIds.length) return [];
    const rows = await prisma.quotation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const out = [];
    for (const row of rows) out.push(serializeQuotation(await persistExpiry(row)));
    return out;
  }

  const rows = await prisma.quotation.findMany({
    where: { customerUserId: actor.userId, status: { in: CUSTOMER_VISIBLE } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const out = [];
  for (const row of rows) out.push(serializeQuotation(await persistExpiry(row)));
  return out;
}

export async function getQuotation(actor: QuotationActor, id: string) {
  if (!UUID_RE.test(id)) throw new QuotationError("Quotation not found", 404, "NOT_FOUND");
  const row = await prisma.quotation.findFirst({ where: { id } });
  if (!row) throw new QuotationError("Quotation not found", 404, "NOT_FOUND");
  const current = await persistExpiry(row);
  await assertCanRead(actor, current);
  return serializeQuotation(current);
}

async function assertCanRead(actor: QuotationActor, row: Quotation) {
  if (ADMIN_ROLES.has(actor.role)) return;
  if (row.customerUserId === actor.userId) {
    if (row.status === "draft") throw new QuotationError("Quotation not found", 404, "NOT_FOUND");
    return;
  }
  if (!DEALER_QUOTATION_ROLES.has(actor.role)) {
    throw new QuotationError("Quotation not found", 404, "NOT_FOUND");
  }
  const scope = await dealerScope(actor);
  if (!scope.admin && !scope.dealerIds.includes(row.dealerId)) {
    throw new QuotationError("Quotation not found", 404, "NOT_FOUND");
  }
}

export async function createQuotation(actor: QuotationActor, body: Record<string, unknown>) {
  requireDealerRole(actor);
  const scope = await dealerScope(actor);
  const requestedDealer = optionalId(body.dealerId ?? body.dealer_id);
  let dealerId = requestedDealer;
  if (scope.admin) {
    if (!dealerId) throw new QuotationError("dealerId is required", 400, "DEALER_REQUIRED");
  } else {
    if (!scope.dealerIds.length) throw new QuotationError("No dealer workspace", 403, "NO_DEALER");
    if (dealerId && !scope.dealerIds.includes(dealerId)) {
      throw new QuotationError("Not authorized for this dealer", 403, "DEALER_FORBIDDEN");
    }
    dealerId = dealerId ?? scope.dealerIds[0]!;
  }

  if (!(await canWriteQuotations(actor, dealerId))) {
    throw new QuotationError("Not authorized to create quotations", 403, "FORBIDDEN");
  }

  if (body.customerUserId != null || body.customer_user_id != null) {
    const claimed = String(body.customerUserId ?? body.customer_user_id);
    if (claimed && !UUID_RE.test(claimed)) {
      throw new QuotationError("Invalid customerUserId", 400, "FORGED_CUSTOMER_ID");
    }
  }

  const customerUserId = await resolveCustomerUserId(body);
  const organizationId = await resolveOrganizationId(dealerId, body.organizationId ?? body.organization_id);
  const leadId = optionalId(body.leadId ?? body.lead_id);
  const vehicleId = optionalId(body.vehicleId ?? body.vehicle_id);
  const inventoryId = optionalId(body.inventoryId ?? body.inventory_id);

  await Promise.all([
    assertLeadForDealer(dealerId, leadId),
    assertVehicleForDealer(dealerId, vehicleId),
    assertInventoryForDealer(dealerId, inventoryId),
  ]);

  const dealer = await prisma.dealer.findFirst({ where: { id: dealerId } });
  const bodyPricing = pricingFromBody(body);
  if (inventoryId && bodyPricing.exShowroomAmount <= 0) {
    const inv = await prisma.newCarInventory.findFirst({ where: { id: inventoryId } });
    if (inv) bodyPricing.exShowroomAmount = money(inv.exShowroomPrice);
  }
  const priced = calculateQuotationTotals(bodyPricing);
  if (priced.exShowroomAmount <= 0 && priced.totalAmount <= 0) {
    throw new QuotationError("Enter an ex-showroom amount", 400, "AMOUNT_REQUIRED");
  }

  const snapshot = await buildSnapshot({
    customerUserId,
    dealerId,
    organizationId,
    leadId,
    vehicleId,
    inventoryId,
  });

  const row = await prisma.quotation.create({
    data: {
      quotationNumber: await uniqueNumber(),
      status: "draft",
      currency: "INR",
      pincode: pincodeFrom(body, dealer?.pincode ?? null),
      customerUserId,
      dealerId,
      organizationId,
      leadId,
      vehicleId,
      inventoryId,
      ...priced,
      notes: body.notes != null ? String(body.notes).slice(0, 4000) : null,
      metadata: snapshot as unknown as Prisma.InputJsonValue,
      createdByUserId: actor.userId,
    },
  });

  return serializeQuotation(row);
}

export async function updateQuotation(actor: QuotationActor, id: string, body: Record<string, unknown>) {
  requireDealerRole(actor);
  const existing = await prisma.quotation.findFirst({ where: { id } });
  if (!existing) throw new QuotationError("Quotation not found", 404, "NOT_FOUND");
  await assertCanRead(actor, existing);
  if (!(await canWriteQuotations(actor, existing.dealerId))) {
    throw new QuotationError("Not authorized to update quotations", 403, "FORBIDDEN");
  }
  if (existing.status !== "draft") {
    throw new QuotationError("Only draft quotations can be edited", 409, "NOT_DRAFT");
  }

  if (body.organizationId != null || body.organization_id != null) {
    await resolveOrganizationId(existing.dealerId, body.organizationId ?? body.organization_id);
  }
  if (body.customerUserId != null || body.customer_user_id != null) {
    const claimed = String(body.customerUserId ?? body.customer_user_id);
    if (claimed && claimed !== existing.customerUserId) {
      throw new QuotationError("customerUserId cannot be changed", 400, "FORGED_CUSTOMER_ID");
    }
  }
  if (body.dealerId != null || body.dealer_id != null) {
    const claimed = String(body.dealerId ?? body.dealer_id);
    if (claimed && claimed !== existing.dealerId) {
      throw new QuotationError("dealerId cannot be changed", 400, "FORGED_DEALER_ID");
    }
  }
  if (body.totalAmount != null || body.total_amount != null) {
    const claimed = money(body.totalAmount ?? body.total_amount);
    const next = calculateQuotationTotals({
      ...pricingFromBody({
        ex_showroom_amount: existing.exShowroomAmount,
        rto_amount: existing.rtoAmount,
        insurance_amount: existing.insuranceAmount,
        accessories_amount: existing.accessoriesAmount,
        finance_amount: existing.financeAmount,
        exchange_amount: existing.exchangeAmount,
        other_charges: existing.otherCharges,
        discount_amount: existing.discountAmount,
        tax_amount: existing.taxAmount,
        ...body,
      }),
    });
    if (claimed !== next.totalAmount) {
      /* ignore client total; still reject obvious spoof attempts as ignored, not applied */
    }
  }

  const vehicleId =
    body.vehicleId !== undefined || body.vehicle_id !== undefined
      ? optionalId(body.vehicleId ?? body.vehicle_id)
      : existing.vehicleId;
  const inventoryId =
    body.inventoryId !== undefined || body.inventory_id !== undefined
      ? optionalId(body.inventoryId ?? body.inventory_id)
      : existing.inventoryId;
  const leadId =
    body.leadId !== undefined || body.lead_id !== undefined
      ? optionalId(body.leadId ?? body.lead_id)
      : existing.leadId;

  await Promise.all([
    assertLeadForDealer(existing.dealerId, leadId),
    assertVehicleForDealer(existing.dealerId, vehicleId),
    assertInventoryForDealer(existing.dealerId, inventoryId),
  ]);

  const priced = calculateQuotationTotals({
    exShowroomAmount: money(body.exShowroomAmount ?? body.ex_showroom_amount ?? existing.exShowroomAmount),
    rtoAmount: money(body.rtoAmount ?? body.rto_amount ?? existing.rtoAmount),
    insuranceAmount: money(body.insuranceAmount ?? body.insurance_amount ?? existing.insuranceAmount),
    accessoriesAmount: money(body.accessoriesAmount ?? body.accessories_amount ?? existing.accessoriesAmount),
    financeAmount: money(body.financeAmount ?? body.finance_amount ?? existing.financeAmount),
    exchangeAmount: money(body.exchangeAmount ?? body.exchange_amount ?? existing.exchangeAmount),
    otherCharges: money(body.otherCharges ?? body.other_charges ?? existing.otherCharges),
    discountAmount: money(body.discountAmount ?? body.discount_amount ?? existing.discountAmount),
    taxAmount: money(body.taxAmount ?? body.tax_amount ?? existing.taxAmount),
  });

  const snapshot = await buildSnapshot({
    customerUserId: existing.customerUserId,
    dealerId: existing.dealerId,
    organizationId: existing.organizationId,
    leadId,
    vehicleId,
    inventoryId,
  });

  const row = await prisma.quotation.update({
    where: { id: existing.id },
    data: {
      ...priced,
      leadId,
      vehicleId,
      inventoryId,
      pincode: pincodeFrom(body, existing.pincode),
      notes: body.notes != null ? String(body.notes).slice(0, 4000) : existing.notes,
      metadata: snapshot as unknown as Prisma.InputJsonValue,
    },
  });
  return serializeQuotation(row);
}

export async function issueQuotation(actor: QuotationActor, id: string) {
  requireDealerRole(actor);
  const existing = await prisma.quotation.findFirst({ where: { id } });
  if (!existing) throw new QuotationError("Quotation not found", 404, "NOT_FOUND");
  await assertCanRead(actor, existing);
  if (!(await canWriteQuotations(actor, existing.dealerId))) {
    throw new QuotationError("Not authorized to issue quotations", 403, "FORBIDDEN");
  }
  if (existing.status !== "draft") {
    throw new QuotationError("Only draft quotations can be issued", 409, "NOT_DRAFT");
  }
  if (money(existing.totalAmount) <= 0) {
    throw new QuotationError("Cannot issue a quotation with zero total", 400, "AMOUNT_REQUIRED");
  }

  const snapshot = await buildSnapshot({
    customerUserId: existing.customerUserId,
    dealerId: existing.dealerId,
    organizationId: existing.organizationId,
    leadId: existing.leadId,
    vehicleId: existing.vehicleId,
    inventoryId: existing.inventoryId,
  });
  const frozen: QuotationSnapshot = {
    ...snapshot,
    pricing: {
      exShowroomAmount: money(existing.exShowroomAmount),
      rtoAmount: money(existing.rtoAmount),
      insuranceAmount: money(existing.insuranceAmount),
      accessoriesAmount: money(existing.accessoriesAmount),
      financeAmount: money(existing.financeAmount),
      exchangeAmount: money(existing.exchangeAmount),
      otherCharges: money(existing.otherCharges),
      discountAmount: money(existing.discountAmount),
      taxAmount: money(existing.taxAmount),
      totalAmount: money(existing.totalAmount),
    },
  };

  const window = defaultValidityWindow();
  const row = await prisma.quotation.update({
    where: { id: existing.id },
    data: {
      status: "issued",
      issuedAt: new Date(),
      validityStart: window.validityStart,
      validityEnd: window.validityEnd,
      metadata: frozen as unknown as Prisma.InputJsonValue,
    },
  });
  return serializeQuotation(row);
}

export async function cancelQuotation(actor: QuotationActor, id: string) {
  requireDealerRole(actor);
  const existing = await prisma.quotation.findFirst({ where: { id } });
  if (!existing) throw new QuotationError("Quotation not found", 404, "NOT_FOUND");
  await assertCanRead(actor, existing);
  if (!(await canWriteQuotations(actor, existing.dealerId))) {
    throw new QuotationError("Not authorized to cancel quotations", 403, "FORBIDDEN");
  }
  if (existing.status === "cancelled") return serializeQuotation(existing);
  if (existing.status === "expired") {
    throw new QuotationError("Expired quotations cannot be cancelled", 409, "EXPIRED");
  }
  const row = await prisma.quotation.update({
    where: { id: existing.id },
    data: { status: "cancelled", cancelledAt: new Date() },
  });
  return serializeQuotation(row);
}

export { stripClientOwnedFields } from "@/lib/quotations/serialize";
