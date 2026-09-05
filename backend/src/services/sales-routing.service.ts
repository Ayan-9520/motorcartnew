import { prisma } from "@/lib/prisma";
import { SalesOsError } from "@/lib/sales-os/errors";
import { COVERAGE_DOMAINS, ROUTING_MODES } from "@/lib/sales-os/constants";
import { extractIndiaPin } from "@/lib/sales-os/quality";
import {
  notifyDealer,
  organizationForDealer,
  requireDealerContext,
  writeAudit,
} from "@/lib/sales-os/access";
import { assertSalesOsOn, isAdminRole, type SalesActor } from "@/lib/sales-os/http";
import { UNASSIGNED_DEALER_SLUG } from "@/lib/leads/enquiry.types";
import { validateIndiaPincode } from "@/lib/inventory/pin";
import { InventoryError } from "@/lib/inventory/errors";

export async function upsertCoverage(
  actor: SalesActor,
  input: {
    dealerId?: string;
    domain?: string;
    postalCode: string;
    priority?: number;
    routingMode?: string;
    capacity?: number | null;
    status?: string;
    organizationId?: string;
  },
) {
  assertSalesOsOn();
  const dealer = await requireDealerContext(actor, input.dealerId);
  let pin: string;
  try {
    pin = validateIndiaPincode(input.postalCode);
  } catch (e) {
    if (e instanceof InventoryError) throw new SalesOsError(e.message, 400, "INVALID_PINCODE");
    throw e;
  }
  const domain = input.domain ?? "VEHICLE";
  if (!(COVERAGE_DOMAINS as readonly string[]).includes(domain)) {
    throw new SalesOsError("Invalid domain", 400, "INVALID_DOMAIN");
  }
  const mode = input.routingMode ?? "STANDARD";
  if (!(ROUTING_MODES as readonly string[]).includes(mode)) {
    throw new SalesOsError("Invalid routing mode", 400, "INVALID_ROUTING_MODE");
  }
  if (input.organizationId) {
    const org = await organizationForDealer(dealer.id);
    if (!org || org.id !== input.organizationId) {
      throw new SalesOsError("Forged organization id", 403, "FORGED_ORGANIZATION");
    }
  }
  const org = await organizationForDealer(dealer.id);
  return prisma.partnerCoverage.upsert({
    where: { dealerId_domain_postalCode: { dealerId: dealer.id, domain, postalCode: pin } },
    create: {
      dealerId: dealer.id,
      organizationId: org?.id ?? null,
      domain,
      postalCode: pin,
      priority: input.priority ?? 100,
      routingMode: mode,
      capacity: input.capacity ?? null,
      status: input.status ?? "ACTIVE",
    },
    update: {
      priority: input.priority ?? 100,
      routingMode: mode,
      capacity: input.capacity ?? null,
      status: input.status ?? "ACTIVE",
    },
  });
}

export async function listCoverage(actor: SalesActor) {
  assertSalesOsOn();
  const dealer = await requireDealerContext(actor);
  return prisma.partnerCoverage.findMany({
    where: { dealerId: dealer.id },
    orderBy: [{ postalCode: "asc" }, { priority: "desc" }],
  });
}

async function eligibleCoverages(pin: string, domain = "VEHICLE") {
  const rows = await prisma.partnerCoverage.findMany({
    where: { postalCode: pin, domain, status: "ACTIVE" },
    include: { dealer: { select: { id: true, ownerId: true, deletedAt: true, isVerified: true } } },
  });
  const filtered = rows.filter((r) => !r.dealer.deletedAt);
  filtered.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.id.localeCompare(b.id);
  });
  return filtered;
}

export async function routeLeadByPin(leadId: string, actor?: SalesActor) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId } });
  if (!lead) throw new SalesOsError("Lead not found", 404, "LEAD_NOT_FOUND");
  const pin = lead.pincode || extractIndiaPin((lead.metadata as Record<string, unknown>)?.location);
  if (!pin) return { routed: false, reason: "no_pin" as const };

  const currentDealer = await prisma.dealer.findFirst({ where: { id: lead.dealerId } });
  const alreadyAssigned = currentDealer && currentDealer.slug !== UNASSIGNED_DEALER_SLUG;
  if (alreadyAssigned) return { routed: false, reason: "already_assigned" as const };

  const coverages = await eligibleCoverages(pin, "VEHICLE");
  if (!coverages.length) return { routed: false, reason: "no_coverage" as const };

  const chosen = coverages[0]!;
  const previous = await prisma.leadAssignment.findMany({
    where: { leadId, status: { in: ["ASSIGNED", "ACCEPTED"] } },
  });
  if (previous.length) {
    await prisma.leadAssignment.updateMany({
      where: { id: { in: previous.map((p) => p.id) } },
      data: { status: "RELEASED", releasedAt: new Date() },
    });
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      dealerId: chosen.dealerId,
      metadata: {
        ...((lead.metadata as object) ?? {}),
        assignment: "assigned",
        pipeline_status: "ASSIGNED",
        routing_mode: chosen.routingMode,
        routing_pin: pin,
      },
    },
  });

  const assignment = await prisma.leadAssignment.create({
    data: {
      leadId: lead.id,
      dealerId: chosen.dealerId,
      organizationId: chosen.organizationId,
      assignedUserId: chosen.dealer.ownerId,
      routingReason: `exact_pin:${pin};priority:${chosen.priority};mode:${chosen.routingMode}`,
      routingMode: chosen.routingMode,
      status: "ASSIGNED",
    },
  });

  await notifyDealer(chosen.dealer.ownerId, "New assigned lead", `PIN ${pin} lead assigned to your dealership`, {
    leadId: lead.id,
    assignmentId: assignment.id,
    dedupe_key: `sales_os:assigned:${lead.id}:${chosen.dealerId}`,
  });

  if (actor) {
    await writeAudit(actor, "lead.routed", { leadId: lead.id, dealerId: chosen.dealerId, pin });
  }
  return { routed: true, assignment, reason: "exact_pin" as const };
}

export async function listAssignments(actor: SalesActor, leadId?: string) {
  assertSalesOsOn();
  if (isAdminRole(actor.role)) {
    return prisma.leadAssignment.findMany({
      where: leadId ? { leadId } : {},
      orderBy: { assignedAt: "desc" },
      take: 200,
    });
  }
  const dealer = await requireDealerContext(actor);
  return prisma.leadAssignment.findMany({
    where: { dealerId: dealer.id, ...(leadId ? { leadId } : {}) },
    orderBy: { assignedAt: "desc" },
    take: 200,
  });
}

export async function manualAssign(actor: SalesActor, leadId: string, dealerId: string, reason: string) {
  assertSalesOsOn();
  if (!isAdminRole(actor.role)) throw new SalesOsError("Forbidden", 403, "FORBIDDEN");
  const lead = await prisma.lead.findFirst({ where: { id: leadId } });
  if (!lead) throw new SalesOsError("Lead not found", 404, "LEAD_NOT_FOUND");
  const dealer = await prisma.dealer.findFirst({ where: { id: dealerId, deletedAt: null } });
  if (!dealer) throw new SalesOsError("Dealer not found", 404, "DEALER_NOT_FOUND");

  await prisma.leadAssignment.updateMany({
    where: { leadId, status: { in: ["ASSIGNED", "ACCEPTED"] } },
    data: { status: "RELEASED", releasedAt: new Date() },
  });
  await prisma.lead.update({
    where: { id: lead.id },
    data: { dealerId: dealer.id },
  });
  const assignment = await prisma.leadAssignment.create({
    data: {
      leadId: lead.id,
      dealerId: dealer.id,
      assignedUserId: dealer.ownerId,
      routingReason: `manual:${reason}`,
      routingMode: "STANDARD",
      status: "ASSIGNED",
    },
  });
  await notifyDealer(dealer.ownerId, "Lead reassigned", reason, {
    leadId: lead.id,
    assignmentId: assignment.id,
    dedupe_key: `sales_os:reassign:${lead.id}:${dealer.id}:${assignment.id}`,
  });
  await writeAudit(actor, "lead.reassigned", { leadId, dealerId, reason });
  return assignment;
}

export async function adminRoutingOverview() {
  const [unroutedDealer, total, assigned, listings] = await Promise.all([
    prisma.dealer.findFirst({ where: { slug: UNASSIGNED_DEALER_SLUG } }),
    prisma.lead.count(),
    prisma.leadAssignment.count({ where: { status: { in: ["ASSIGNED", "ACCEPTED"] } } }),
    prisma.leadBoardListing.count({ where: { status: "AVAILABLE" } }),
  ]);
  const unrouted = unroutedDealer
    ? await prisma.lead.count({ where: { dealerId: unroutedDealer.id } })
    : 0;
  return { unrouted, routed_assignments: assigned, total_leads: total, board_available: listings };
}
