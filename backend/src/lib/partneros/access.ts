import { prisma } from "@/lib/prisma";
import { PartnerOsError } from "./errors";
import { isPlatformAdmin, type PartnerActor } from "./http";
import type { OrganizationType } from "@/lib/organization/organization.types";

export async function requireOrganization(
  actor: PartnerActor,
  allowed: OrganizationType[] = [],
  orgId?: string,
) {
  if (isPlatformAdmin(actor.role) && orgId) {
    const org = await prisma.organization.findFirst({ where: { id: orgId, deletedAt: null } });
    if (!org) throw new PartnerOsError("Organization not found", 404, "ORG_NOT_FOUND");
    if (allowed.length && !allowed.includes(org.type as OrganizationType)) {
      throw new PartnerOsError("Wrong organization type", 403, "WRONG_ORG_TYPE");
    }
    return org;
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: actor.userId,
      status: "active",
      organization: {
        deletedAt: null,
        ...(allowed.length ? { type: { in: allowed } } : {}),
        ...(orgId ? { id: orgId } : {}),
      },
    },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) throw new PartnerOsError("Organization workspace not found", 403, "ORG_NOT_FOUND");
  return membership.organization;
}

export async function publicOrgBySlug(slug: string) {
  const org = await prisma.organization.findFirst({
    where: { slug, deletedAt: null, status: "active" },
    include: { profile: true, branches: { where: { isActive: true }, take: 20 } },
  });
  if (!org) throw new PartnerOsError("Company not found", 404, "NOT_FOUND");
  return org;
}
