import type { GrowthBusinessType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GROWTH_BUSINESS_TYPE_ALIASES } from "@/lib/growth/constants";
import { defaultLimits, defaultUsage, ensureEntitlements } from "@/lib/growth/entitlements";
import { randomSuffix, slugifyBase } from "@/lib/growth/slug";

export function parseGrowthBusinessType(raw: unknown): GrowthBusinessType | null {
  if (raw == null) return null;
  const key = String(raw).toLowerCase().trim();
  return GROWTH_BUSINESS_TYPE_ALIASES[key] ?? null;
}

async function uniqueWorkspaceSlug(base: string): Promise<string> {
  let slug = slugifyBase(base);
  for (let i = 0; i < 8; i++) {
    const exists = await prisma.growthWorkspace.findFirst({ where: { slug } });
    if (!exists) return slug;
    slug = `${slugifyBase(base)}-${randomSuffix(4)}`;
  }
  return `${slugifyBase(base)}-${randomSuffix(8)}`;
}

export function listGrowthWorkspaces(ownerUserId: string) {
  return prisma.growthWorkspace.findMany({
    where: { ownerUserId, status: { not: "archived" } },
    include: { entitlements: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getGrowthWorkspace(id: string, ownerUserId: string, isAdmin: boolean) {
  return prisma.growthWorkspace.findFirst({
    where: {
      id,
      ...(isAdmin ? {} : { ownerUserId }),
      status: { not: "archived" },
    },
    include: { entitlements: true },
  });
}

export async function createGrowthWorkspace(
  ownerUserId: string,
  data: {
    name: string;
    businessType: GrowthBusinessType;
    entityId?: string | null;
    subscriptionPlanSlug?: string | null;
    metadata?: Prisma.InputJsonValue;
  }
) {
  const slug = await uniqueWorkspaceSlug(data.name);
  const planSlug = data.subscriptionPlanSlug ?? "free";

  return prisma.$transaction(async (tx) => {
    const workspace = await tx.growthWorkspace.create({
      data: {
        ownerUserId,
        name: data.name,
        slug,
        businessType: data.businessType,
        entityId: data.entityId ?? null,
        subscriptionPlanSlug: data.subscriptionPlanSlug ?? null,
        subscriptionTier: planSlug,
        metadata: data.metadata ?? {},
      },
    });

    await tx.growthWorkspaceEntitlement.create({
      data: {
        workspaceId: workspace.id,
        planSlug,
        limits: defaultLimits(planSlug),
        usage: defaultUsage(),
      },
    });

    return tx.growthWorkspace.findUniqueOrThrow({
      where: { id: workspace.id },
      include: { entitlements: true },
    });
  });
}

export async function updateGrowthWorkspace(
  id: string,
  ownerUserId: string,
  isAdmin: boolean,
  data: Prisma.GrowthWorkspaceUpdateInput
) {
  const existing = await getGrowthWorkspace(id, ownerUserId, isAdmin);
  if (!existing) return null;

  return prisma.growthWorkspace.update({
    where: { id },
    data,
    include: { entitlements: true },
  });
}

export async function getGrowthEntitlements(workspaceId: string) {
  return ensureEntitlements(workspaceId);
}

export async function updateGrowthEntitlements(
  workspaceId: string,
  data: {
    planSlug?: string;
    limits?: Prisma.InputJsonValue;
    usage?: Prisma.InputJsonValue;
    trialEndsAt?: Date | null;
  }
) {
  await ensureEntitlements(workspaceId);
  return prisma.growthWorkspaceEntitlement.update({
    where: { workspaceId },
    data: {
      ...(data.planSlug != null ? { planSlug: data.planSlug } : {}),
      ...(data.limits != null ? { limits: data.limits } : {}),
      ...(data.usage != null ? { usage: data.usage } : {}),
      ...(data.trialEndsAt !== undefined ? { trialEndsAt: data.trialEndsAt } : {}),
      refreshedAt: new Date(),
    },
  });
}
