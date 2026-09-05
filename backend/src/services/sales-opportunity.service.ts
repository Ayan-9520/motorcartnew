import { prisma } from "@/lib/prisma";
import { SalesOsError } from "@/lib/sales-os/errors";
import { OPPORTUNITY_STAGES, TERMINAL_OPPORTUNITY_STAGES } from "@/lib/sales-os/constants";
import { organizationForDealer, requireDealerContext, requireLeadForDealer, writeAudit } from "@/lib/sales-os/access";
import { assertSalesOsOn, type SalesActor } from "@/lib/sales-os/http";
import { createCrmActivity } from "@/services/sales-crm.service";

export async function createOpportunity(
  actor: SalesActor,
  input: { leadId: string; estimatedValue?: number; dealerId?: string; organizationId?: string },
) {
  assertSalesOsOn();
  const dealer = await requireDealerContext(actor, input.dealerId);
  const lead = await requireLeadForDealer(dealer.id, input.leadId);
  if (input.organizationId) {
    const org = await organizationForDealer(dealer.id);
    if (!org || org.id !== input.organizationId) {
      throw new SalesOsError("Forged organization id", 403, "FORGED_ORGANIZATION");
    }
  }
  const existing = await prisma.opportunity.findFirst({
    where: { leadId: lead.id, dealerId: dealer.id, status: { notIn: [...TERMINAL_OPPORTUNITY_STAGES] } },
  });
  if (existing) throw new SalesOsError("Open opportunity already exists", 409, "DUPLICATE_OPPORTUNITY");
  const org = await organizationForDealer(dealer.id);
  const opp = await prisma.opportunity.create({
    data: {
      leadId: lead.id,
      customerUserId: lead.customerUserId,
      dealerId: dealer.id,
      organizationId: org?.id ?? null,
      vehicleId: lead.vehicleId,
      status: "OPEN",
      quality: lead.quality,
      estimatedValue: input.estimatedValue ?? null,
      ownerUserId: actor.userId,
    },
  });
  await createCrmActivity(actor, {
    leadId: lead.id,
    opportunityId: opp.id,
    activityType: "STATUS_CHANGE",
    subject: "Opportunity opened",
  });
  await writeAudit(actor, "opportunity.created", { opportunityId: opp.id, leadId: lead.id });
  return opp;
}

export async function listOpportunities(actor: SalesActor) {
  assertSalesOsOn();
  const dealer = await requireDealerContext(actor);
  return prisma.opportunity.findMany({
    where: { dealerId: dealer.id },
    include: {
      lead: { select: { id: true, name: true, source: true, quality: true, vehicleInterest: true, phone: true } },
      links: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export async function getPipeline(actor: SalesActor) {
  const rows = await listOpportunities(actor);
  const columns = OPPORTUNITY_STAGES.filter((s) => s !== "CLOSED").map((stage) => ({
    stage,
    items: rows.filter((r) => r.status === stage),
  }));
  return { columns, total: rows.length };
}

export async function updateOpportunityStage(actor: SalesActor, id: string, status: string, lostReason?: string) {
  assertSalesOsOn();
  if (!(OPPORTUNITY_STAGES as readonly string[]).includes(status)) {
    throw new SalesOsError("Invalid stage", 400, "INVALID_STAGE");
  }
  const dealer = await requireDealerContext(actor);
  const opp = await prisma.opportunity.findFirst({ where: { id, dealerId: dealer.id } });
  if (!opp) throw new SalesOsError("Opportunity not found", 404, "OPPORTUNITY_NOT_FOUND");
  const patch: {
    status: string;
    lostReason?: string | null;
    wonAt?: Date | null;
    lostAt?: Date | null;
  } = { status };
  if (status === "WON") {
    patch.wonAt = new Date();
    patch.lostAt = null;
  }
  if (status === "LOST") {
    patch.lostAt = new Date();
    patch.lostReason = lostReason ?? "unspecified";
  }
  const updated = await prisma.opportunity.update({ where: { id: opp.id }, data: patch });
  await createCrmActivity(actor, {
    leadId: opp.leadId,
    opportunityId: opp.id,
    activityType: "STATUS_CHANGE",
    subject: `Opportunity ${status}`,
    notes: lostReason,
  });
  await writeAudit(actor, "opportunity.stage", { opportunityId: opp.id, status, lostReason });
  return updated;
}

export async function linkOpportunityObject(
  actor: SalesActor,
  opportunityId: string,
  objectType: "QUOTATION" | "TEST_DRIVE",
  objectId: string,
) {
  assertSalesOsOn();
  const dealer = await requireDealerContext(actor);
  const opp = await prisma.opportunity.findFirst({ where: { id: opportunityId, dealerId: dealer.id } });
  if (!opp) throw new SalesOsError("Opportunity not found", 404, "OPPORTUNITY_NOT_FOUND");
  if (objectType === "QUOTATION") {
    const q = await prisma.quotation.findFirst({ where: { id: objectId, dealerId: dealer.id } });
    if (!q) throw new SalesOsError("Quotation not found", 404, "QUOTATION_NOT_FOUND");
  } else {
    const td = await prisma.testDriveBooking.findFirst({ where: { id: objectId, dealerId: dealer.id } });
    if (!td) throw new SalesOsError("Test drive not found", 404, "TEST_DRIVE_NOT_FOUND");
  }
  return prisma.opportunityLink.upsert({
    where: {
      opportunityId_objectType_objectId: { opportunityId, objectType, objectId },
    },
    create: { opportunityId, objectType, objectId },
    update: {},
  });
}
