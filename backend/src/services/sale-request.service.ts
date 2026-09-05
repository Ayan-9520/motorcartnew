import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SuperAppError } from "@/lib/superapp/errors";
import type { SuperActor } from "@/lib/superapp/http";
import { isAdminRole, isDealerRole } from "@/lib/superapp/http";
import { UNASSIGNED_DEALER_SLUG } from "@/lib/leads/enquiry.types";
import { organizationForDealer, requireDealerContext } from "@/lib/sales-os/access";

function json(v: unknown): Prisma.InputJsonValue {
  return v as Prisma.InputJsonValue;
}

async function notify(userId: string, title: string, body: string, kind: string, payload: Record<string, unknown>) {
  const dedupe = String(payload.dedupe_key ?? "");
  if (dedupe) {
    const existing = await prisma.notification.findFirst({
      where: { userId, kind, payload: { path: ["dedupe_key"], equals: dedupe } },
    });
    if (existing) return;
  }
  await prisma.notification.create({
    data: { userId, title, body, message: body, kind, payload: json(payload) },
  });
}

export function maskSaleRequest(row: {
  id: string;
  brand: string;
  model: string;
  variant: string | null;
  year: number;
  kmsDriven: number;
  owners: number;
  fuelType: string;
  transmission: string;
  city: string;
  state: string;
  expectedPrice: unknown;
  status: string;
  conditionNotes: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    variant: row.variant,
    year: row.year,
    kmsDriven: row.kmsDriven,
    owners: row.owners,
    fuelType: row.fuelType,
    transmission: row.transmission,
    city: row.city,
    state: row.state,
    expectedPrice: row.expectedPrice,
    status: row.status,
    conditionNotes: row.conditionNotes,
    createdAt: row.createdAt,
  };
}

export async function createSaleRequest(
  actor: SuperActor,
  input: {
    brand: string;
    model: string;
    variant?: string;
    year: number;
    kmsDriven: number;
    owners?: number;
    fuelType: string;
    transmission: string;
    city: string;
    state: string;
    expectedPrice?: number;
    conditionNotes?: string;
    customerVehicleId?: string;
    vehicleId?: string;
  },
) {
  if (actor.role !== "customer" && !isAdminRole(actor.role)) throw new SuperAppError("Forbidden", 403, "FORBIDDEN");
  if (input.brand.trim().length < 2 || input.model.trim().length < 1) {
    throw new SuperAppError("Brand and model are required", 400, "INVALID_VEHICLE");
  }
  return prisma.vehicleSaleRequest.create({
    data: {
      customerUserId: actor.userId,
      customerVehicleId: input.customerVehicleId,
      vehicleId: input.vehicleId,
      brand: input.brand.trim(),
      model: input.model.trim(),
      variant: input.variant,
      year: input.year,
      kmsDriven: input.kmsDriven,
      owners: input.owners ?? 1,
      fuelType: input.fuelType,
      transmission: input.transmission,
      city: input.city,
      state: input.state,
      expectedPrice: input.expectedPrice,
      conditionNotes: input.conditionNotes,
      status: "DRAFT",
    },
  });
}

export async function submitSaleRequest(actor: SuperActor, id: string) {
  const row = await prisma.vehicleSaleRequest.findUnique({ where: { id } });
  if (!row || row.customerUserId !== actor.userId) throw new SuperAppError("Not found", 404, "NOT_FOUND");
  if (!["DRAFT", "CANCELLED"].includes(row.status)) throw new SuperAppError("Cannot submit", 400, "INVALID_STATUS");
  let leadId: string | null = row.leadId;
  const unassigned = await prisma.dealer.findFirst({ where: { slug: UNASSIGNED_DEALER_SLUG, deletedAt: null } });
  if (unassigned && !leadId) {
    const lead = await prisma.lead.create({
      data: {
        dealerId: unassigned.id,
        customerUserId: actor.userId,
        name: "Sell request",
        phone: "0000000000",
        source: "sell_request",
        vehicleInterest: `${row.brand} ${row.model}`,
        metadata: json({ sale_request_id: row.id, pii_withheld: true }),
      },
    });
    leadId = lead.id;
  }
  const updated = await prisma.vehicleSaleRequest.update({
    where: { id },
    data: { status: "OPEN_FOR_OFFERS", leadId },
  });
  await notify(actor.userId, "Sell request submitted", `${row.brand} ${row.model} is open for offers`, "sell_request", {
    dedupe_key: `sale_submit:${id}`,
    saleRequestId: id,
  });
  return updated;
}

export async function cancelSaleRequest(actor: SuperActor, id: string) {
  const row = await prisma.vehicleSaleRequest.findUnique({ where: { id } });
  if (!row || row.customerUserId !== actor.userId) throw new SuperAppError("Not found", 404, "NOT_FOUND");
  return prisma.vehicleSaleRequest.update({ where: { id }, data: { status: "CANCELLED" } });
}

export async function expireStaleOffers() {
  await prisma.vehiclePurchaseOffer.updateMany({
    where: { status: "ACTIVE", validUntil: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
}

export async function listMySaleRequests(actor: SuperActor) {
  await expireStaleOffers();
  return prisma.vehicleSaleRequest.findMany({
    where: { customerUserId: actor.userId },
    include: { valuations: true, offers: true, media: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listOpenSaleRequests(actor: SuperActor) {
  if (!isDealerRole(actor.role) && !isAdminRole(actor.role)) throw new SuperAppError("Forbidden", 403, "FORBIDDEN");
  await expireStaleOffers();
  const rows = await prisma.vehicleSaleRequest.findMany({
    where: { status: "OPEN_FOR_OFFERS" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(maskSaleRequest);
}

export async function submitValuation(
  actor: SuperActor,
  input: { saleRequestId: string; amountMin: number; amountMax: number; condition?: string; validUntil?: string; notes?: string },
) {
  const member = await prisma.organizationMember.findFirst({
    where: { userId: actor.userId, status: "active", organization: { type: "VALUATION_PARTNER", deletedAt: null } },
    include: { organization: true },
  });
  if (!member && !isAdminRole(actor.role)) throw new SuperAppError("Forbidden", 403, "FORBIDDEN");
  const orgId = member?.organizationId;
  if (!orgId && !isAdminRole(actor.role)) throw new SuperAppError("Forbidden", 403, "FORBIDDEN");
  const sale = await prisma.vehicleSaleRequest.findUnique({ where: { id: input.saleRequestId } });
  if (!sale) throw new SuperAppError("Not found", 404, "NOT_FOUND");
  if (!["OPEN_FOR_OFFERS", "UNDER_REVIEW", "SUBMITTED"].includes(sale.status)) {
    throw new SuperAppError("Request is not available for valuation", 400, "INVALID_STATUS");
  }
  if (!(input.amountMin > 0) || input.amountMax < input.amountMin) {
    throw new SuperAppError("Invalid valuation range", 400, "INVALID_AMOUNT");
  }
  const partnerOrgId = orgId ?? String((await prisma.organization.findFirst({ where: { type: "VALUATION_PARTNER" } }))?.id);
  if (!partnerOrgId) throw new SuperAppError("Valuation organization required", 400, "NO_ORG");
  const valuation = await prisma.vehicleValuation.create({
    data: {
      saleRequestId: sale.id,
      valuationPartnerOrgId: partnerOrgId,
      amountMin: input.amountMin,
      amountMax: input.amountMax,
      condition: input.condition,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      notes: input.notes,
      status: "SUBMITTED",
    },
  });
  await notify(sale.customerUserId, "Valuation received", "A valuation partner submitted an indicative valuation", "valuation", {
    dedupe_key: `val:${valuation.id}`,
    valuationId: valuation.id,
  });
  return valuation;
}

export async function submitPurchaseOffer(
  actor: SuperActor,
  input: { saleRequestId: string; amount: number; validUntil?: string; notes?: string; dealerId?: string },
) {
  const dealer = await requireDealerContext(actor, input.dealerId);
  const org = await organizationForDealer(dealer.id);
  const sale = await prisma.vehicleSaleRequest.findUnique({ where: { id: input.saleRequestId } });
  if (!sale || sale.status !== "OPEN_FOR_OFFERS") throw new SuperAppError("Not open for offers", 400, "INVALID_STATUS");
  if (!(input.amount > 0)) throw new SuperAppError("Invalid amount", 400, "INVALID_AMOUNT");
  const offer = await prisma.vehiclePurchaseOffer.create({
    data: {
      saleRequestId: sale.id,
      dealerId: dealer.id,
      organizationId: org?.id,
      amount: input.amount,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      notes: input.notes,
      status: "ACTIVE",
    },
  });
  await notify(sale.customerUserId, "Dealer offer received", `${dealer.name} submitted a purchase offer`, "sale_offer", {
    dedupe_key: `offer:${offer.id}`,
    offerId: offer.id,
  });
  return offer;
}

export async function withdrawOffer(actor: SuperActor, offerId: string) {
  const dealer = await requireDealerContext(actor);
  const offer = await prisma.vehiclePurchaseOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.dealerId !== dealer.id) throw new SuperAppError("Forbidden", 403, "CROSS_TENANT");
  if (offer.status !== "ACTIVE") throw new SuperAppError("Cannot withdraw", 400, "INVALID_STATUS");
  return prisma.vehiclePurchaseOffer.update({ where: { id: offerId }, data: { status: "WITHDRAWN" } });
}

export async function acceptOffer(actor: SuperActor, offerId: string) {
  return prisma.$transaction(async (tx) => {
    const offer = await tx.vehiclePurchaseOffer.findUnique({ where: { id: offerId } });
    if (!offer) throw new SuperAppError("Offer not found", 404, "NOT_FOUND");
    const sale = await tx.vehicleSaleRequest.findUnique({ where: { id: offer.saleRequestId } });
    if (!sale || sale.customerUserId !== actor.userId) throw new SuperAppError("Forbidden", 403, "CROSS_TENANT");
    if (sale.status !== "OPEN_FOR_OFFERS" || offer.status !== "ACTIVE") {
      throw new SuperAppError("Offer cannot be accepted", 400, "INVALID_STATUS");
    }
    if (offer.validUntil && offer.validUntil < new Date()) {
      await tx.vehiclePurchaseOffer.update({ where: { id: offerId }, data: { status: "EXPIRED" } });
      throw new SuperAppError("Offer expired", 400, "EXPIRED");
    }
    await tx.vehiclePurchaseOffer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } });
    await tx.vehiclePurchaseOffer.updateMany({
      where: { saleRequestId: sale.id, id: { not: offerId }, status: "ACTIVE" },
      data: { status: "REJECTED" },
    });
    await tx.vehicleSaleRequest.update({ where: { id: sale.id }, data: { status: "OFFER_ACCEPTED" } });
    return { accepted: true, saleStatus: "OFFER_ACCEPTED", payment: false };
  }).then(async (result) => {
    const offer = await prisma.vehiclePurchaseOffer.findUnique({ where: { id: offerId }, include: { dealer: true } });
    if (offer) {
      await notify(offer.dealer.ownerId, "Offer accepted", "A customer accepted your purchase offer. Settlement is not automatic.", "sale_offer", {
        dedupe_key: `accepted:${offerId}`,
        offerId,
      });
    }
    return result;
  });
}

export async function listValuationQueue(actor: SuperActor) {
  const member = await prisma.organizationMember.findFirst({
    where: { userId: actor.userId, status: "active", organization: { type: "VALUATION_PARTNER" } },
  });
  if (!member && !isAdminRole(actor.role)) throw new SuperAppError("Forbidden", 403, "FORBIDDEN");
  const rows = await prisma.vehicleSaleRequest.findMany({
    where: { status: { in: ["OPEN_FOR_OFFERS", "UNDER_REVIEW"] } },
    include: { media: true, valuations: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    ...maskSaleRequest(r),
    media: r.media.map((m) => ({
      id: m.id,
      url: m.processedUrl,
      mediaType: m.mediaType,
      authenticityStatus: m.authenticityStatus,
      originalHidden: true,
    })),
    valuations: r.valuations.filter((v) => isAdminRole(actor.role) || v.valuationPartnerOrgId === member?.organizationId),
  }));
}
