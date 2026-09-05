import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getVehicleDetail } from "@/lib/vehicles/vehicle-detail.service";
import {
  ENQUIRY_DUPLICATE_WINDOW_MS,
  UNASSIGNED_DEALER_SLUG,
  mapLeadToPipelineStatus,
  pickEnquiryDealer,
  type CustomerEnquiryInput,
  type CustomerEnquiryResult,
  type EnquiryAssignment,
} from "./enquiry.types";
import { validateEnquiryInput, type ValidatedEnquiry } from "./enquiry.validation";
import { stripClientOwnerFields } from "@/lib/customer/enquiries";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class EnquiryError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "EnquiryError";
    this.status = status;
  }
}

async function platformOwnerId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: { in: ["super_admin", "admin"] }, deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) throw new EnquiryError("No platform admin configured — run database seed", 500);
  return admin.id;
}

/** Sentinel dealer for unassigned leads. Data row only — no schema change. Never used for random routing. */
export async function ensureUnassignedDealer() {
  const existing = await prisma.dealer.findFirst({
    where: { slug: UNASSIGNED_DEALER_SLUG, deletedAt: null },
  });
  if (existing) return existing;

  const ownerId = await platformOwnerId();
  try {
    return await prisma.dealer.create({
      data: {
        ownerId,
        name: "MotorCart Unassigned Queue",
        slug: UNASSIGNED_DEALER_SLUG,
        city: "Unassigned",
        state: "NA",
        isVerified: false,
        verificationStatus: "unassigned_queue",
      },
    });
  } catch {
    const raced = await prisma.dealer.findFirst({
      where: { slug: UNASSIGNED_DEALER_SLUG, deletedAt: null },
    });
    if (raced) return raced;
    throw new EnquiryError("Could not resolve unassigned queue", 500);
  }
}

async function findDealerByIdOrSlug(id?: string | null, slug?: string | null) {
  if (id && UUID_RE.test(id)) {
    const byId = await prisma.dealer.findFirst({ where: { id, deletedAt: null } });
    if (byId) return byId;
  }
  if (slug && slug !== UNASSIGNED_DEALER_SLUG) {
    const bySlug = await prisma.dealer.findFirst({ where: { slug, deletedAt: null } });
    if (bySlug) return bySlug;
  }
  return null;
}

/**
 * Route to the dealer already on the listing/inventory.
 * If none, return the unassigned sentinel — never auto-create marketplace mock dealers, never randomize.
 */
export async function resolveEnquiryDealer(input: {
  dealerIdRaw: string | null;
  dealerSlug: string | null;
  vehicleDealerId: string | null;
}): Promise<{ dealer: Awaited<ReturnType<typeof ensureUnassignedDealer>>; assignment: EnquiryAssignment }> {
  const fromVehicle = await findDealerByIdOrSlug(input.vehicleDealerId, null);
  const fromRequest = await findDealerByIdOrSlug(input.dealerIdRaw, input.dealerSlug);
  return pickEnquiryDealer({
    vehicleDealer: fromVehicle,
    requestDealer: fromRequest,
    unassigned: await ensureUnassignedDealer(),
  });
}

export async function findDuplicateEnquiry(phone: string, vehicleKey: string | null, now = new Date()) {
  const since = new Date(now.getTime() - ENQUIRY_DUPLICATE_WINDOW_MS);
  return prisma.lead.findFirst({
    where: {
      phone,
      createdAt: { gte: since },
      ...(vehicleKey
        ? {
            OR: [
              ...(UUID_RE.test(vehicleKey) ? [{ vehicleId: vehicleKey }] : []),
              { vehicleInterest: vehicleKey },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

async function mirrorDealerLead(args: {
  dealerId: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  vehicleTitle: string | null;
  location: string | null;
  metadata: Record<string, unknown>;
  assignment: EnquiryAssignment;
}) {
  try {
    await prisma.dealerLead.create({
      data: {
        dealerId: args.dealerId,
        customerName: args.name,
        name: args.name,
        phone: args.phone,
        email: args.email,
        city: args.location,
        source: args.source,
        stage: args.assignment === "assigned" ? "assigned" : "new",
        status: "new",
        preferredModel: args.vehicleTitle,
        score: 60,
        metadata: args.metadata as Prisma.InputJsonValue,
      },
    });
  } catch {
    /* dealer_leads optional — canonical row is Lead */
  }
}

export async function createCustomerEnquiry(
  input: CustomerEnquiryInput,
  options?: { now?: Date; actorUserId?: string },
): Promise<CustomerEnquiryResult> {
  const parsed = validateEnquiryInput(input);
  if (!parsed.ok) throw new EnquiryError(parsed.message, 400);
  const value = parsed.value;
  const now = options?.now ?? new Date();

  const detail = value.vehicleIdRaw || value.vehicleSlug
    ? await getVehicleDetail(value.vehicleIdRaw || value.vehicleSlug || "")
    : null;

  const marketplaceVehicleId =
    detail?.source_type === "marketplace" && UUID_RE.test(detail.id) ? detail.id : undefined;
  const vehicleKey = marketplaceVehicleId || value.vehicleIdRaw || value.vehicleTitle || value.vehicleSlug;

  const duplicate = await findDuplicateEnquiry(value.phone, vehicleKey, now);
  if (duplicate) {
    const meta = (duplicate.metadata ?? {}) as Record<string, unknown>;
    return {
      lead: duplicate,
      assignment: meta.assignment === "assigned" ? "assigned" : "unassigned",
      duplicate: true,
      pipelineStatus: mapLeadToPipelineStatus(duplicate.status, meta),
    };
  }

  const { dealer, assignment } = await resolveEnquiryDealer({
    dealerIdRaw: value.dealerIdRaw,
    dealerSlug: value.dealerSlug,
    vehicleDealerId: detail?.dealer?.id ?? null,
  });

  const pipelineStatus = assignment === "assigned" ? "ASSIGNED" : "NEW";
  const metadata: Record<string, unknown> = {
    ...stripClientOwnerFields(value.metadata ?? {}),
    assignment,
    pipeline_status: pipelineStatus,
    vehicle_slug: value.vehicleSlug ?? detail?.slug,
    vehicle_title: value.vehicleTitle ?? detail?.title,
    vehicle_source_type: detail?.source_type ?? null,
    catalog_variant_id: detail?.catalog_variant_id ?? null,
    inventory_id: detail?.source_type === "dealer_inventory" ? detail.id : null,
    non_uuid_vehicle_id:
      value.vehicleIdRaw && !UUID_RE.test(value.vehicleIdRaw) ? value.vehicleIdRaw : undefined,
    category: value.category ?? detail?.category,
    location: value.location ?? detail?.location,
    preferred_contact: value.preferredContact,
    consent: value.consent,
    purchasable: detail?.purchasable ?? false,
    ...(options?.actorUserId ? { customer_user_id: options.actorUserId } : {}),
  };

  const lead = await prisma.lead.create({
    data: {
      dealerId: dealer.id,
      name: value.name,
      phone: value.phone,
      email: value.email,
      source: value.source,
      status: "new",
      vehicleId: marketplaceVehicleId,
      vehicleInterest: value.vehicleTitle ?? detail?.title ?? value.vehicleSlug,
      notes: value.notes,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });

  await mirrorDealerLead({
    dealerId: dealer.id,
    name: value.name,
    phone: value.phone,
    email: value.email,
    source: value.source,
    vehicleTitle: value.vehicleTitle ?? detail?.title ?? null,
    location: value.location ?? detail?.location ?? null,
    metadata,
    assignment,
  });

  if (assignment === "assigned" && dealer.ownerId) {
    await prisma.notification.create({
      data: {
        userId: dealer.ownerId,
        title: "New customer enquiry",
        body: `${lead.name} enquired about ${value.vehicleTitle ?? detail?.title ?? "a vehicle"}`,
        message: `${lead.name} · ${lead.phone}`,
        kind: "lead",
        payload: { leadId: lead.id, dealerId: dealer.id, source: lead.source, assignment },
      },
    });
  }

  try {
    const { applySalesOsOnEnquiry } = await import("@/services/sales-crm.service");
    const { routeLeadByPin } = await import("@/services/sales-routing.service");
    await applySalesOsOnEnquiry(lead.id, {
      actorUserId: options?.actorUserId,
      consent: value.consent,
      preferredContact: value.preferredContact,
      email: value.email,
      location: value.location,
      source: value.source,
    });
    if (assignment === "unassigned") {
      const routed = await routeLeadByPin(lead.id);
      if (routed.routed) {
        const fresh = await prisma.lead.findFirst({ where: { id: lead.id } });
        return {
          lead: fresh ?? lead,
          assignment: "assigned",
          duplicate: false,
          pipelineStatus: "ASSIGNED",
        };
      }
    }
  } catch {
    /* Sales OS enrichment must not block enquiry capture */
  }

  return { lead, assignment, duplicate: false, pipelineStatus };
}

/** @deprecated Use createCustomerEnquiry. Kept so existing callers compile. */
export async function createMarketplaceLead(input: CustomerEnquiryInput) {
  const result = await createCustomerEnquiry(input);
  return result.lead;
}

export function validatedVehicleKey(value: ValidatedEnquiry): string | null {
  return value.vehicleIdRaw || value.vehicleTitle || value.vehicleSlug;
}
