import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { PartnerOsError } from "@/lib/partneros/errors";
import {
  AUTH_STATUSES,
  JOB_APP_STATUSES,
  QUOTE_KINDS,
  VIN_COMPATIBILITY_LIVE,
} from "@/lib/partneros/constants";
import { requireOrganization, publicOrgBySlug } from "@/lib/partneros/access";
import { isPlatformAdmin, type PartnerActor } from "@/lib/partneros/http";
import { InventoryError } from "@/lib/inventory/errors";
import { validateIndiaPincode } from "@/lib/inventory/pin";
import type { OrganizationType } from "@/lib/organization/organization.types";

const PARTS_TYPES: OrganizationType[] = ["PARTS_SELLER", "PARTS_MANUFACTURER"];
const SERVICE_TYPES: OrganizationType[] = ["SERVICE_CENTER", "WORKSHOP"];
const OEM_TYPES: OrganizationType[] = ["OEM", "MANUFACTURER"];
const LENDER_TYPES: OrganizationType[] = ["BANK", "NBFC"];
const INSURER_TYPES: OrganizationType[] = ["INSURANCE_COMPANY", "INSURANCE_BROKER"];

function pin(raw: string) {
  try {
    return validateIndiaPincode(raw);
  } catch (e) {
    if (e instanceof InventoryError) throw new PartnerOsError(e.message, e.status, e.code);
    throw e;
  }
}

function metaObj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

/** Adapter: PartOrderItem FKs to Part; catalog SKU lives on PartProduct. */
async function catalogPartIdForProduct(productId: string): Promise<string> {
  const product = await prisma.partProduct.findFirst({ where: { id: productId } });
  if (!product) throw new PartnerOsError("Product not found", 404, "NOT_FOUND");
  const meta = metaObj(product.metadata);
  if (typeof meta.catalogPartId === "string") {
    const existing = await prisma.part.findFirst({ where: { id: meta.catalogPartId } });
    if (existing) return existing.id;
  }
  const part = await prisma.part.create({
    data: {
      sellerId: product.sellerId,
      name: product.name,
      slug: `pp-${product.id.slice(0, 8)}-${Date.now().toString(36)}`,
      category: product.categorySlug,
      brand: product.brand,
      price: BigInt(Math.round(Number(product.price))),
      stock: product.stock,
      sku: product.sku,
      metadata: { partProductId: product.id },
    },
  });
  await prisma.partProduct.update({
    where: { id: product.id },
    data: { metadata: { ...meta, catalogPartId: part.id } },
  });
  return part.id;
}

export function vinCompatibilityLive() {
  return VIN_COMPATIBILITY_LIVE;
}

export async function upsertPartProduct(
  actor: PartnerActor,
  input: {
    id?: string;
    name: string;
    sku?: string;
    partNumber?: string;
    brand?: string;
    manufacturer?: string;
    classification?: string;
    categorySlug: string;
    vehicleCategory?: string;
    price: number;
    stock?: number;
    pincode?: string;
  },
) {
  const org = await requireOrganization(actor, PARTS_TYPES);
  if (input.pincode) pin(input.pincode);
  const data = {
    sellerId: actor.userId,
    organizationId: org.id,
    name: input.name,
    sku: input.sku,
    partNumber: input.partNumber,
    brand: input.brand,
    manufacturer: input.manufacturer,
    classification: input.classification,
    categorySlug: input.categorySlug,
    vehicleCategory: input.vehicleCategory,
    price: input.price,
    stock: input.stock ?? 0,
    pincode: input.pincode,
    status: "ACTIVE",
  };
  if (input.id) {
    const existing = await prisma.partProduct.findFirst({ where: { id: input.id, organizationId: org.id } });
    if (!existing) throw new PartnerOsError("Product not found", 404, "NOT_FOUND");
    return prisma.partProduct.update({ where: { id: existing.id }, data });
  }
  return prisma.partProduct.create({ data });
}

export async function listSellerProducts(actor: PartnerActor) {
  const org = await requireOrganization(actor, PARTS_TYPES);
  return prisma.partProduct.findMany({
    where: { organizationId: org.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function searchParts(q: {
  q?: string;
  partNumber?: string;
  brand?: string;
  pincode?: string;
  vehicleCategory?: string;
  make?: string;
  model?: string;
}) {
  if (q.pincode) pin(q.pincode);
  const productIdsFromCompat =
    q.make && q.model
      ? (
          await prisma.partCompatibilityRule.findMany({
            where: {
              brand: { equals: q.make, mode: "insensitive" },
              model: { equals: q.model, mode: "insensitive" },
              partProductId: { not: null },
            },
            select: { partProductId: true },
          })
        )
          .map((r) => r.partProductId)
          .filter((id): id is string => Boolean(id))
      : null;

  return prisma.partProduct.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      ...(q.pincode ? { pincode: q.pincode } : {}),
      ...(q.brand ? { brand: { contains: q.brand, mode: "insensitive" } } : {}),
      ...(q.partNumber ? { partNumber: { contains: q.partNumber, mode: "insensitive" } } : {}),
      ...(q.vehicleCategory ? { vehicleCategory: q.vehicleCategory } : {}),
      ...(productIdsFromCompat ? { id: { in: productIdsFromCompat.length ? productIdsFromCompat : ["__none__"] } } : {}),
      ...(q.q
        ? {
            OR: [
              { name: { contains: q.q, mode: "insensitive" } },
              { sku: { contains: q.q, mode: "insensitive" } },
              { partNumber: { contains: q.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { compatibilityRules: true },
    take: 40,
  });
}

export async function addCompatibility(
  actor: PartnerActor,
  partProductId: string,
  rule: { brand: string; model: string; variant?: string; yearFrom?: number; yearTo?: number; fuelType?: string },
) {
  const org = await requireOrganization(actor, PARTS_TYPES);
  const product = await prisma.partProduct.findFirst({ where: { id: partProductId, organizationId: org.id } });
  if (!product) throw new PartnerOsError("Product not found", 404, "NOT_FOUND");
  return prisma.partCompatibilityRule.create({
    data: {
      partProductId,
      brand: rule.brand,
      model: rule.model,
      variant: rule.variant,
      yearFrom: rule.yearFrom,
      yearTo: rule.yearTo,
      fuelType: rule.fuelType,
    },
  });
}

export async function placePartOrder(
  actor: PartnerActor,
  input: { sellerId: string; items: { productId: string; qty: number }[] },
) {
  if (actor.role !== "customer" && !isPlatformAdmin(actor.role)) {
    throw new PartnerOsError("Customers place orders", 403, "FORBIDDEN");
  }
  if (!input.items?.length) throw new PartnerOsError("Items required", 400, "INVALID");
  const products = await prisma.partProduct.findMany({ where: { id: { in: input.items.map((i) => i.productId) } } });
  for (const it of input.items) {
    const p = products.find((x) => x.id === it.productId);
    if (!p || p.deletedAt) throw new PartnerOsError("Product not found", 404, "NOT_FOUND");
    if (p.sellerId !== input.sellerId) throw new PartnerOsError("Seller mismatch", 403, "CROSS_TENANT");
    if (p.stock < it.qty) throw new PartnerOsError("Insufficient stock", 409, "NO_STOCK");
  }
  const total = input.items.reduce((s, it) => {
    const p = products.find((x) => x.id === it.productId)!;
    return s + Number(p.price) * it.qty;
  }, 0);
  const orgId = products[0]?.organizationId;
  const orderItems = [];
  for (const it of input.items) {
    const p = products.find((x) => x.id === it.productId)!;
    const catalogPartId = await catalogPartIdForProduct(p.id);
    orderItems.push({ productId: catalogPartId, qty: it.qty, price: p.price });
  }
  const order = await prisma.partOrder.create({
    data: {
      buyerId: actor.userId,
      sellerId: input.sellerId,
      organizationId: orgId,
      status: "pending",
      fulfillmentStatus: "UNFULFILLED",
      total,
      items: { create: orderItems },
    },
    include: { items: true },
  });
  for (const it of input.items) {
    await prisma.partProduct.update({
      where: { id: it.productId },
      data: { stock: { decrement: it.qty } },
    });
  }
  return order;
}

export async function listSellerOrders(actor: PartnerActor) {
  const org = await requireOrganization(actor, PARTS_TYPES);
  return prisma.partOrder.findMany({
    where: { organizationId: org.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getPartOrder(actor: PartnerActor, id: string) {
  const row = await prisma.partOrder.findFirst({ where: { id }, include: { items: true } });
  if (!row) throw new PartnerOsError("Order not found", 404, "NOT_FOUND");
  if (row.buyerId === actor.userId || isPlatformAdmin(actor.role)) return row;
  if (row.sellerId === actor.userId) return row;
  try {
    const org = await requireOrganization(actor, PARTS_TYPES);
    if (row.organizationId === org.id) return row;
  } catch {
    /* not a seller */
  }
  throw new PartnerOsError("Forbidden", 403, "CROSS_TENANT");
}

export async function searchServiceCenters(pincode: string) {
  const code = pin(pincode);
  const covered = await prisma.organizationCoverage.findMany({
    where: { domain: "SERVICE", postalCode: code, status: "ACTIVE" },
    select: { organizationId: true },
  });
  const orgs = covered.map((c) => c.organizationId);
  const members = orgs.length
    ? await prisma.organizationMember.findMany({
        where: { organizationId: { in: orgs }, status: "active", role: "OWNER" },
        select: { userId: true },
      })
    : [];
  const ownerIds = members.map((m) => m.userId);
  return prisma.serviceCenter.findMany({
    where: {
      OR: [{ pincode: code }, ...(ownerIds.length ? [{ ownerId: { in: ownerIds } }] : [])],
    },
    take: 40,
  });
}

export async function createServiceSlot(
  actor: PartnerActor,
  input: { serviceCenterId: string; startsAt: string; capacity?: number },
) {
  const org = await requireOrganization(actor, SERVICE_TYPES);
  const center = await prisma.serviceCenter.findFirst({
    where: { id: input.serviceCenterId, ownerId: actor.userId },
  });
  if (!center && !isPlatformAdmin(actor.role)) throw new PartnerOsError("Service center not found", 404, "NOT_FOUND");
  return prisma.serviceSlot.create({
    data: {
      organizationId: org.id,
      serviceCenterId: input.serviceCenterId,
      startsAt: new Date(input.startsAt),
      capacity: input.capacity ?? 1,
    },
  });
}

export async function requestServiceBooking(
  actor: PartnerActor,
  input: { serviceCenterId: string; slotId?: string; scheduledAt?: string },
) {
  if (actor.role !== "customer" && !isPlatformAdmin(actor.role)) {
    throw new PartnerOsError("Forbidden", 403, "FORBIDDEN");
  }
  let scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
  if (input.slotId) {
    const slot = await prisma.serviceSlot.findFirst({ where: { id: input.slotId } });
    if (!slot || slot.status !== "OPEN") throw new PartnerOsError("Slot not available", 409, "NO_SLOT");
    if (slot.bookedCount >= slot.capacity) throw new PartnerOsError("Slot full", 409, "NO_SLOT");
    scheduledAt = slot.startsAt;
    await prisma.serviceSlot.update({
      where: { id: slot.id },
      data: { bookedCount: { increment: 1 }, status: slot.bookedCount + 1 >= slot.capacity ? "FULL" : "OPEN" },
    });
  }
  return prisma.serviceBooking.create({
    data: {
      userId: actor.userId,
      serviceCenterId: input.serviceCenterId,
      scheduledAt: scheduledAt ?? null,
      status: "pending",
    },
  });
}

export async function createJobCard(
  actor: PartnerActor,
  input: { serviceCenterId: string; bookingId?: string; complaint?: string; customerUserId?: string },
) {
  await requireOrganization(actor, SERVICE_TYPES);
  const center = await prisma.serviceCenter.findFirst({ where: { id: input.serviceCenterId, ownerId: actor.userId } });
  if (!center && !isPlatformAdmin(actor.role)) throw new PartnerOsError("Forbidden", 403, "CROSS_TENANT");
  return prisma.serviceJobCard.create({
    data: {
      serviceCenterId: input.serviceCenterId,
      bookingId: input.bookingId,
      complaint: input.complaint,
      customerUserId: input.customerUserId,
      status: "pending",
    },
  });
}

export async function listJobCards(actor: PartnerActor) {
  await requireOrganization(actor, SERVICE_TYPES);
  const centers = await prisma.serviceCenter.findMany({ where: { ownerId: actor.userId }, select: { id: true } });
  return prisma.serviceJobCard.findMany({
    where: { serviceCenterId: { in: centers.map((c) => c.id) } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function createEstimate(
  actor: PartnerActor,
  input: { serviceCenterId: string; customerUserId: string; items: { description: string; amount: number }[] },
) {
  const org = await requireOrganization(actor, SERVICE_TYPES);
  const center = await prisma.serviceCenter.findFirst({ where: { id: input.serviceCenterId, ownerId: actor.userId } });
  if (!center && !isPlatformAdmin(actor.role)) throw new PartnerOsError("Forbidden", 403, "CROSS_TENANT");
  const total = input.items.reduce((s, i) => s + i.amount, 0);
  return prisma.serviceEstimate.create({
    data: {
      organizationId: org.id,
      serviceCenterId: input.serviceCenterId,
      customerUserId: input.customerUserId,
      status: "SENT",
      totalAmount: total,
      items: { create: input.items.map((i) => ({ description: i.description, amount: i.amount })) },
    },
    include: { items: true },
  });
}

export async function decideEstimateItem(actor: PartnerActor, itemId: string, approve: boolean) {
  const item = await prisma.serviceEstimateItem.findFirst({ include: { estimate: true }, where: { id: itemId } });
  if (!item) throw new PartnerOsError("Item not found", 404, "NOT_FOUND");
  if (item.estimate.customerUserId !== actor.userId && !isPlatformAdmin(actor.role)) {
    throw new PartnerOsError("Forbidden", 403, "FORBIDDEN");
  }
  return prisma.serviceEstimateItem.update({
    where: { id: itemId },
    data: { approved: approve, rejected: !approve, decidedAt: new Date() },
  });
}

export async function approvedEstimateTotal(estimateId: string) {
  const items = await prisma.serviceEstimateItem.findMany({ where: { estimateId, approved: true } });
  return items.reduce((s, i) => s + Number(i.amount), 0);
}

export async function serviceHistory(actor: PartnerActor, customerUserId?: string) {
  const uid = customerUserId ?? actor.userId;
  if (uid !== actor.userId && !isPlatformAdmin(actor.role)) {
    await requireOrganization(actor, SERVICE_TYPES);
  }
  const [records, cards] = await Promise.all([
    prisma.serviceRecord.findMany({ where: { userId: uid }, orderBy: { servicedAt: "desc" }, take: 50 }),
    prisma.serviceJobCard.findMany({
      where: { customerUserId: uid, status: "completed" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return { records, jobCards: cards };
}

export async function authorizeDealer(
  actor: PartnerActor,
  input: { dealerOrganizationId: string; brand: string; dealerId?: string; status?: string },
) {
  const oem = await requireOrganization(actor, OEM_TYPES);
  const status = input.status ?? "pending";
  if (!(AUTH_STATUSES as readonly string[]).includes(status)) throw new PartnerOsError("Invalid status", 400, "INVALID");
  if (status === "authorized" && !isPlatformAdmin(actor.role)) {
    throw new PartnerOsError("Only admin can mark OEM Authorized", 403, "FORBIDDEN");
  }
  return prisma.organizationDealerAuthorization.upsert({
    where: {
      oemOrganizationId_dealerOrganizationId_brand: {
        oemOrganizationId: oem.id,
        dealerOrganizationId: input.dealerOrganizationId,
        brand: input.brand,
      },
    },
    update: { status, dealerId: input.dealerId },
    create: {
      oemOrganizationId: oem.id,
      dealerOrganizationId: input.dealerOrganizationId,
      dealerId: input.dealerId,
      brand: input.brand,
      status,
    },
  });
}

export async function setAuthorizationStatus(actor: PartnerActor, id: string, status: string) {
  if (!(AUTH_STATUSES as readonly string[]).includes(status)) throw new PartnerOsError("Invalid status", 400, "INVALID");
  if (status === "authorized" && !isPlatformAdmin(actor.role)) {
    throw new PartnerOsError("Only admin can mark OEM Authorized", 403, "FORBIDDEN");
  }
  const row = await prisma.organizationDealerAuthorization.findFirst({ where: { id } });
  if (!row) throw new PartnerOsError("Not found", 404, "NOT_FOUND");
  if (!isPlatformAdmin(actor.role)) {
    const oem = await requireOrganization(actor, OEM_TYPES);
    if (row.oemOrganizationId !== oem.id) throw new PartnerOsError("Forbidden", 403, "CROSS_TENANT");
  }
  return prisma.organizationDealerAuthorization.update({ where: { id }, data: { status } });
}

export async function listOemNetwork(actor: PartnerActor) {
  const oem = await requireOrganization(actor, OEM_TYPES);
  return prisma.organizationDealerAuthorization.findMany({
    where: { oemOrganizationId: oem.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function oemMetrics(actor: PartnerActor) {
  const oem = await requireOrganization(actor, OEM_TYPES);
  const auths = await prisma.organizationDealerAuthorization.findMany({
    where: { oemOrganizationId: oem.id, status: "authorized" },
  });
  const dealerIds = auths.map((a) => a.dealerId).filter(Boolean) as string[];
  const [quotes, drives, leads, won] = await Promise.all([
    dealerIds.length ? prisma.quotation.count({ where: { dealerId: { in: dealerIds } } }) : 0,
    dealerIds.length ? prisma.testDriveBooking.count({ where: { dealerId: { in: dealerIds } } }) : 0,
    dealerIds.length ? prisma.lead.count({ where: { dealerId: { in: dealerIds } } }) : 0,
    dealerIds.length
      ? prisma.opportunity.count({ where: { dealerId: { in: dealerIds }, status: "WON" } })
      : 0,
  ]);
  return { authorizedDealers: auths.length, quotations: quotes, testDrives: drives, leads, wonOpportunities: won };
}

export async function upsertFinanceProduct(
  actor: PartnerActor,
  input: {
    name: string;
    loanType: string;
    minAmount: number;
    maxAmount: number;
    tenureMinMonths: number;
    tenureMaxMonths: number;
    rateMin?: number;
    rateMax?: number;
    processingFee?: string;
    vehicleCategory?: string;
    bankId?: string;
  },
) {
  const org = await requireOrganization(actor, LENDER_TYPES);
  return prisma.financeProduct.create({
    data: {
      organizationId: org.id,
      bankId: input.bankId,
      name: input.name,
      loanType: input.loanType,
      vehicleCategory: input.vehicleCategory,
      minAmount: input.minAmount,
      maxAmount: input.maxAmount,
      tenureMinMonths: input.tenureMinMonths,
      tenureMaxMonths: input.tenureMaxMonths,
      rateMin: input.rateMin,
      rateMax: input.rateMax,
      processingFee: input.processingFee,
    },
  });
}

export async function listFinanceProducts(actor: PartnerActor) {
  const org = await requireOrganization(actor, LENDER_TYPES);
  return prisma.financeProduct.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" } });
}

export async function listLenderApplications(actor: PartnerActor) {
  const org = await requireOrganization(actor, LENDER_TYPES);
  const bank = await prisma.bank.findFirst({ where: { organizationId: org.id } });
  if (!bank) return [];
  return prisma.financeApplication.findMany({
    where: { bankId: bank.id },
    take: 100,
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, loanAmount: true, userId: true, createdAt: true },
  });
}

export async function persistPartnerQuote(actor: PartnerActor, input: { userId: string; premium: number }) {
  const org = await requireOrganization(actor, INSURER_TYPES);
  const partner = await prisma.insurancePartner.findFirst({ where: { organizationId: org.id } });
  if (!partner) throw new PartnerOsError("Insurance partner not linked", 400, "NO_PARTNER");
  return prisma.insuranceQuote.create({
    data: {
      userId: input.userId,
      partnerId: partner.id,
      premium: input.premium,
      quoteKind: "PARTNER_QUOTE",
    },
  });
}

export async function listCustomerQuotes(actor: PartnerActor) {
  return prisma.insuranceQuote.findMany({
    where: { userId: actor.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function listInsurerQuotes(actor: PartnerActor) {
  const org = await requireOrganization(actor, INSURER_TYPES);
  const partner = await prisma.insurancePartner.findFirst({ where: { organizationId: org.id } });
  if (!partner) return [];
  return prisma.insuranceQuote.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function issuePolicy(
  actor: PartnerActor,
  input: {
    customerUserId: string;
    policyNumber: string;
    policyType: string;
    startAt: string;
    expiryAt: string;
    premium?: number;
    vehicleId?: string;
    renewalOfId?: string;
  },
) {
  const org = await requireOrganization(actor, INSURER_TYPES);
  const partner = await prisma.insurancePartner.findFirst({ where: { organizationId: org.id } });
  return prisma.insurancePolicy.create({
    data: {
      organizationId: org.id,
      customerUserId: input.customerUserId,
      policyNumber: input.policyNumber,
      policyType: input.policyType,
      startAt: new Date(input.startAt),
      expiryAt: new Date(input.expiryAt),
      premium: input.premium,
      vehicleId: input.vehicleId,
      partnerId: partner?.id,
      renewalOfId: input.renewalOfId,
    },
  });
}

export async function listPolicies(actor: PartnerActor) {
  if (actor.role === "customer") {
    return prisma.insurancePolicy.findMany({ where: { customerUserId: actor.userId }, orderBy: { expiryAt: "asc" } });
  }
  const org = await requireOrganization(actor, INSURER_TYPES);
  return prisma.insurancePolicy.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function notifyClaim(
  actor: PartnerActor,
  input: { policyId: string; incidentAt: string; description: string },
) {
  const policy = await prisma.insurancePolicy.findFirst({ where: { id: input.policyId } });
  if (!policy) throw new PartnerOsError("Policy not found", 404, "NOT_FOUND");
  if (policy.customerUserId !== actor.userId && !isPlatformAdmin(actor.role)) {
    const org = await requireOrganization(actor, INSURER_TYPES);
    if (org.id !== policy.organizationId) throw new PartnerOsError("Forbidden", 403, "CROSS_TENANT");
  }
  return prisma.insuranceClaim.create({
    data: {
      organizationId: policy.organizationId,
      policyId: policy.id,
      customerUserId: policy.customerUserId,
      incidentAt: new Date(input.incidentAt),
      description: input.description,
      status: "NOTIFIED",
    },
  });
}

export async function listClaims(actor: PartnerActor) {
  if (actor.role === "customer") {
    return prisma.insuranceClaim.findMany({ where: { customerUserId: actor.userId } });
  }
  const org = await requireOrganization(actor, INSURER_TYPES);
  return prisma.insuranceClaim.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function publicCompany(slug: string) {
  const org = await publicOrgBySlug(slug);
  const jobs = await prisma.jobPosting.findMany({ where: { organizationId: org.id, status: "OPEN" }, take: 20 });
  const ratings = await prisma.partnerRating.aggregate({
    where: { organizationId: org.id },
    _avg: { overall: true },
    _count: true,
  });
  const badges = await prisma.partnerBadgeAssignment.findMany({ where: { organizationId: org.id } });
  const auths = await prisma.organizationDealerAuthorization.findMany({
    where: { dealerOrganizationId: org.id, status: "authorized" },
    select: { brand: true, status: true },
  });
  const certs = await prisma.partnerCertification.findMany({
    where: { organizationId: org.id, status: "GRANTED" },
    select: { code: true },
  });
  return {
    id: org.id,
    slug: org.slug,
    name: org.displayName,
    type: org.type,
    about: org.profile?.description ?? null,
    website: org.profile?.website ?? null,
    branches: org.branches.map((b) => ({ id: b.id, name: b.name, city: b.city, postalCode: b.postalCode })),
    jobs: jobs.map((j) => ({
      id: j.id,
      title: j.title,
      location: j.location,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
    })),
    rating: { overall: ratings._avg.overall, count: ratings._count },
    badges: badges.map((b) => b.badgeCode),
    certifications: certs.map((c) => c.code),
    oemAuthorized: auths.map((a) => a.brand),
  };
}

export async function createJob(
  actor: PartnerActor,
  input: {
    title: string;
    description: string;
    location?: string;
    department?: string;
    careerPath?: string;
    salaryMin?: number;
    salaryMax?: number;
    employmentType?: string;
    experience?: string;
  },
) {
  const org = await requireOrganization(actor);
  return prisma.jobPosting.create({
    data: {
      organizationId: org.id,
      title: input.title,
      description: input.description,
      location: input.location,
      department: input.department,
      careerPath: input.careerPath,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      employmentType: input.employmentType ?? "FULL_TIME",
      experience: input.experience,
    },
  });
}

export async function listJobs(filters?: {
  q?: string;
  careerPath?: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
}) {
  const take = Math.min(Math.max(filters?.limit ?? 50, 1), 50);
  const skip = Math.max(filters?.offset ?? 0, 0);
  return prisma.jobPosting.findMany({
    where: {
      status: "OPEN",
      ...(filters?.organizationId ? { organizationId: filters.organizationId } : {}),
      ...(filters?.careerPath ? { careerPath: filters.careerPath } : {}),
      ...(filters?.q ? { title: { contains: filters.q, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    skip,
    select: {
      id: true,
      title: true,
      location: true,
      department: true,
      careerPath: true,
      salaryMin: true,
      salaryMax: true,
      employmentType: true,
      organizationId: true,
      createdAt: true,
    },
  });
}

export async function getJob(id: string) {
  const job = await prisma.jobPosting.findFirst({
    where: { id, status: "OPEN" },
    include: { organization: { select: { slug: true, displayName: true, type: true } } },
  });
  if (!job) throw new PartnerOsError("Job not found", 404, "NOT_FOUND");
  return job;
}

export async function applyToJob(actor: PartnerActor, jobId: string, coverNote?: string) {
  const job = await prisma.jobPosting.findFirst({ where: { id: jobId, status: "OPEN" } });
  if (!job) throw new PartnerOsError("Job not found", 404, "NOT_FOUND");
  return prisma.jobApplication.create({
    data: {
      jobPostingId: job.id,
      candidateUserId: actor.userId,
      organizationId: job.organizationId,
      coverNote,
      status: "APPLIED",
    },
  });
}

export async function listMyApplications(actor: PartnerActor) {
  return prisma.jobApplication.findMany({
    where: { candidateUserId: actor.userId },
    include: { job: { select: { title: true, location: true } } },
  });
}

export async function listEmployerApplications(actor: PartnerActor, jobId?: string) {
  const org = await requireOrganization(actor);
  return prisma.jobApplication.findMany({
    where: { organizationId: org.id, ...(jobId ? { jobPostingId: jobId } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export async function setApplicationStatus(actor: PartnerActor, applicationId: string, status: string) {
  if (!(JOB_APP_STATUSES as readonly string[]).includes(status)) throw new PartnerOsError("Invalid status", 400, "INVALID");
  if (status === "WITHDRAWN") throw new PartnerOsError("Candidates withdraw their own applications", 403, "FORBIDDEN");
  const org = await requireOrganization(actor);
  const app = await prisma.jobApplication.findFirst({ where: { id: applicationId, organizationId: org.id } });
  if (!app) throw new PartnerOsError("Not found", 404, "NOT_FOUND");
  return prisma.jobApplication.update({ where: { id: app.id }, data: { status } });
}

export async function withdrawApplication(actor: PartnerActor, applicationId: string) {
  const app = await prisma.jobApplication.findFirst({ where: { id: applicationId, candidateUserId: actor.userId } });
  if (!app) throw new PartnerOsError("Not found", 404, "NOT_FOUND");
  return prisma.jobApplication.update({
    where: { id: app.id },
    data: { status: "WITHDRAWN", withdrawnAt: new Date() },
  });
}

export async function upsertCoverage(actor: PartnerActor, domain: string, postalCode: string) {
  const org = await requireOrganization(actor);
  const code = pin(postalCode);
  return prisma.organizationCoverage.upsert({
    where: { organizationId_domain_postalCode: { organizationId: org.id, domain, postalCode: code } },
    update: { status: "ACTIVE" },
    create: { organizationId: org.id, domain, postalCode: code },
  });
}

export async function partnersByPin(domain: string, postalCode: string) {
  const code = pin(postalCode);
  return prisma.organizationCoverage.findMany({
    where: { domain, postalCode: code, status: "ACTIVE" },
    include: { organization: { select: { id: true, name: true, type: true, slug: true } } },
  });
}

export async function submitRating(
  actor: PartnerActor,
  organizationId: string,
  scores: { overall: number; response?: number; pricing?: number; service?: number; experience?: number },
) {
  if (scores.overall < 1 || scores.overall > 5) throw new PartnerOsError("Invalid rating", 400, "INVALID");
  return prisma.partnerRating.create({
    data: {
      organizationId,
      reviewerUserId: actor.userId,
      overall: scores.overall,
      response: scores.response,
      pricing: scores.pricing,
      service: scores.service,
      experience: scores.experience,
      verified: false,
    },
  });
}

export async function grantCertification(
  actor: PartnerActor,
  organizationId: string,
  code: string,
  evidence: Record<string, unknown>,
) {
  if (!isPlatformAdmin(actor.role)) throw new PartnerOsError("Admin only", 403, "FORBIDDEN");
  return prisma.partnerCertification.upsert({
    where: { organizationId_code: { organizationId, code } },
    update: { status: "GRANTED", evidence: evidence as Prisma.InputJsonValue, assignedBy: "admin" },
    create: { organizationId, code, status: "GRANTED", evidence: evidence as Prisma.InputJsonValue, assignedBy: "admin" },
  });
}

export async function oemAuthorizedForOrg(organizationId: string) {
  const n = await prisma.organizationDealerAuthorization.count({
    where: { dealerOrganizationId: organizationId, status: "authorized" },
  });
  return n > 0;
}

export async function addExperience(
  actor: PartnerActor,
  input: { title: string; company: string; startAt: string; endAt?: string; description?: string },
) {
  return prisma.professionalExperience.create({
    data: {
      userId: actor.userId,
      title: input.title,
      company: input.company,
      startAt: new Date(input.startAt),
      endAt: input.endAt ? new Date(input.endAt) : null,
      description: input.description,
    },
  });
}

export async function addSkill(actor: PartnerActor, name: string) {
  return prisma.professionalSkill.upsert({
    where: { userId_name: { userId: actor.userId, name } },
    update: {},
    create: { userId: actor.userId, name },
  });
}

export async function publicProfessional(userId: string) {
  const profile = await prisma.communityUserProfile.findFirst({ where: { userId, isPrivate: false } });
  const experience = await prisma.professionalExperience.findMany({ where: { userId } });
  const skills = await prisma.professionalSkill.findMany({ where: { userId } });
  return {
    displayName: profile?.displayName ?? null,
    headline: profile?.headline ?? null,
    about: profile?.bio ?? null,
    location: profile?.locationCity ?? null,
    experience,
    skills: skills.map((s) => s.name),
  };
}

export async function searchEcosystem(q: string) {
  const term = q.trim();
  if (!term) return { companies: [], jobs: [], professionals: [] };
  const [companies, jobs, professionals] = await Promise.all([
    prisma.organization.findMany({
      where: {
        deletedAt: null,
        status: "active",
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { displayName: { contains: term, mode: "insensitive" } },
          { slug: { contains: term, mode: "insensitive" } },
        ],
      },
      take: 20,
      select: { id: true, slug: true, name: true, displayName: true, type: true },
    }),
    listJobs({ q: term }),
    prisma.communityUserProfile.findMany({
      where: {
        isPrivate: false,
        OR: [
          { displayName: { contains: term, mode: "insensitive" } },
          { headline: { contains: term, mode: "insensitive" } },
          { handle: { contains: term, mode: "insensitive" } },
        ],
      },
      take: 20,
      select: { userId: true, displayName: true, headline: true, handle: true, locationCity: true },
    }),
  ]);
  return { companies, jobs, professionals };
}

export { QUOTE_KINDS };
