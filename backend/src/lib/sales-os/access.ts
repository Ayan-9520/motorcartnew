import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isPartnerPlanSlug,
  resolveFeatureEntitlement,
  type PartnerFeatureKey,
} from "@/lib/organization/entitlements";
import { SalesOsError } from "./errors";
import { isAdminRole, isDealerRole, type SalesActor } from "./http";
import { isLeadBoardEnabled, isPaidLeadsEnabled } from "./flags";

/** Resolve all dealer IDs the actor may access (owner, DealerMember, OrganizationMember→legacyDealerId). */
export async function resolveDealerIdsForActor(actor: SalesActor): Promise<string[]> {
  if (isAdminRole(actor.role)) return [];
  const [owned, members, orgMembers] = await Promise.all([
    prisma.dealer.findMany({
      where: { ownerId: actor.userId, deletedAt: null },
      select: { id: true },
    }),
    prisma.dealerMember.findMany({
      where: { userId: actor.userId, isActive: true },
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
  return [...ids];
}

export async function requireDealerContext(actor: SalesActor, claimedDealerId?: string | null) {
  if (isAdminRole(actor.role) && claimedDealerId) {
    const dealer = await prisma.dealer.findFirst({ where: { id: claimedDealerId, deletedAt: null } });
    if (!dealer) throw new SalesOsError("Dealer not found", 404, "DEALER_NOT_FOUND");
    return dealer;
  }
  if (!isDealerRole(actor.role) && !isAdminRole(actor.role)) {
    throw new SalesOsError("Forbidden", 403, "FORBIDDEN");
  }

  const scopedIds = await resolveDealerIdsForActor(actor);
  if (!scopedIds.length) {
    throw new SalesOsError("Dealer workspace not found", 403, "DEALER_NOT_FOUND");
  }

  if (claimedDealerId) {
    if (!scopedIds.includes(claimedDealerId) && !isAdminRole(actor.role)) {
      throw new SalesOsError("Forged dealer id", 403, "FORGED_DEALER");
    }
    const dealer = await prisma.dealer.findFirst({ where: { id: claimedDealerId, deletedAt: null } });
    if (!dealer) throw new SalesOsError("Dealer not found", 404, "DEALER_NOT_FOUND");
    return dealer;
  }

  const dealer = await prisma.dealer.findFirst({
    where: { id: { in: scopedIds }, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!dealer) throw new SalesOsError("Dealer workspace not found", 403, "DEALER_NOT_FOUND");
  return dealer;
}

export async function requireLeadForDealer(dealerId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId } });
  if (!lead) throw new SalesOsError("Lead not found", 404, "LEAD_NOT_FOUND");
  if (lead.dealerId !== dealerId) throw new SalesOsError("Forbidden", 403, "CROSS_TENANT");
  return lead;
}

export async function organizationForDealer(dealerId: string) {
  return prisma.organization.findFirst({
    where: { legacyDealerId: dealerId, deletedAt: null },
  });
}

export async function assertEntitled(
  dealerId: string,
  feature: PartnerFeatureKey,
  flagOn: boolean,
) {
  if (!flagOn) throw new SalesOsError("Feature is disabled", 403, "FEATURE_DISABLED");
  const org = await organizationForDealer(dealerId);
  if (!org) throw new SalesOsError("Upgrade to unlock this feature", 403, "FEATURE_LOCKED");
  const plan = isPartnerPlanSlug(org.planSlug) ? org.planSlug : "free";
  const overrides = await prisma.organizationEntitlement.findMany({
    where: { organizationId: org.id },
    select: { featureKey: true, granted: true },
  });
  const allowed = resolveFeatureEntitlement(plan, feature, overrides);
  if (!allowed) throw new SalesOsError("Upgrade to unlock this feature", 403, "FEATURE_LOCKED");
  return org;
}

export async function assertLeadBoardAccess(dealerId: string) {
  return assertEntitled(dealerId, "lead_board", isLeadBoardEnabled());
}

export async function assertPaidLeadsAccess(dealerId: string) {
  await assertLeadBoardAccess(dealerId);
  return assertEntitled(dealerId, "paid_leads", isPaidLeadsEnabled());
}

/** Batch 10: plan math never unlocks PHASE_LOCKED features; org grant + flag required. */
export async function assertGrantedOverride(dealerId: string, feature: PartnerFeatureKey, flagOn: boolean) {
  if (!flagOn) throw new SalesOsError("Feature is disabled", 403, "FEATURE_DISABLED");
  const org = await organizationForDealer(dealerId);
  if (!org) throw new SalesOsError("Upgrade to unlock this feature", 403, "FEATURE_LOCKED");
  const grant = await prisma.organizationEntitlement.findFirst({
    where: { organizationId: org.id, featureKey: feature, granted: true },
  });
  if (!grant) throw new SalesOsError("Upgrade to unlock this feature", 403, "FEATURE_LOCKED");
  return org;
}

export async function writeAudit(actor: SalesActor, action: string, metadata: Record<string, unknown>) {
  try {
    await prisma.activityLog.create({
      data: { userId: actor.userId, action, metadata: metadata as Prisma.InputJsonValue },
    });
  } catch {
    /* audit must not block commercial writes */
  }
}

export async function notifyDealer(userId: string, title: string, body: string, payload: Record<string, unknown>) {
  try {
    const dedupe = String(payload.dedupe_key ?? "");
    if (dedupe) {
      const existing = await prisma.notification.findFirst({
        where: { userId, kind: "sales_os", payload: { path: ["dedupe_key"], equals: dedupe } },
        select: { id: true },
      });
      if (existing) return;
    }
    await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        message: body,
        kind: "sales_os",
        payload: payload as Prisma.InputJsonValue,
      },
    });
  } catch {
    /* notifications must not block */
  }
}
