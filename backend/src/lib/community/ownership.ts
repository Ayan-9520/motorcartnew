import type { AppRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CommunityError } from "./errors";
import {
  COMMUNITY_PROFILE_TYPES,
  COMMUNITY_VISIBILITIES,
  type CommunityProfileType,
  type CommunityVisibility,
} from "./constants";

const DEALER_ROLES = new Set<AppRole>([
  "dealer",
  "used_car_dealer",
  "preowned_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
]);

export function roleToProfileType(role: AppRole): CommunityProfileType {
  if (role === "customer") return "CUSTOMER";
  if (DEALER_ROLES.has(role)) return "DEALER";
  if (role === "broker") return "BUSINESS";
  if (
    role === "dsa_agent" ||
    role === "bank_nbfc" ||
    role === "finance_manager" ||
    role === "finance_partner"
  ) {
    return "FINANCE_PROFESSIONAL";
  }
  if (role === "service_center" || role === "service_partner") return "WORKSHOP";
  if (role === "service_technician") return "SERVICE_PROFESSIONAL";
  if (role === "parts_seller") return "PARTS_PROFESSIONAL";
  return "CUSTOMER";
}

export function parseProfileType(value: unknown): CommunityProfileType | undefined {
  if (value == null) return undefined;
  const raw = String(value).trim().toUpperCase().replace(/\s+/g, "_");
  if ((COMMUNITY_PROFILE_TYPES as readonly string[]).includes(raw)) {
    return raw as CommunityProfileType;
  }
  throw new CommunityError("Invalid community profile type", 400, "INVALID_PROFILE_TYPE");
}

export function parseVisibility(value: unknown, fallback: CommunityVisibility = "public"): CommunityVisibility {
  if (value == null || value === "") return fallback;
  const raw = String(value).trim().toLowerCase();
  if ((COMMUNITY_VISIBILITIES as readonly string[]).includes(raw)) {
    return raw as CommunityVisibility;
  }
  throw new CommunityError("Invalid post visibility", 400, "INVALID_VISIBILITY");
}

export function stripClientOwnedPostFields<T extends Record<string, unknown>>(input: T): T {
  const out = { ...input };
  delete out.authorId;
  delete out.author_id;
  delete out.authorUserId;
  delete out.author_user_id;
  delete out.dealerId;
  delete out.dealer_id;
  delete out.organizationId;
  delete out.organization_id;
  delete out.brokerId;
  delete out.broker_id;
  return out;
}

export async function listOwnedDealerIds(userId: string): Promise<string[]> {
  const [owned, memberships] = await Promise.all([
    prisma.dealer.findMany({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true },
    }),
    prisma.dealerMember.findMany({
      where: { userId, isActive: true },
      select: { dealerId: true },
    }),
  ]);
  return [...new Set([...owned.map((d) => d.id), ...memberships.map((m) => m.dealerId)])];
}

export async function listMemberOrganizationIds(userId: string): Promise<string[]> {
  const rows = await prisma.organizationMember.findMany({
    where: {
      userId,
      status: "active",
      organization: { deletedAt: null, status: "active" },
    },
    select: { organizationId: true },
  });
  return rows.map((r) => r.organizationId);
}

export async function resolveDealerAndOrgForUser(userId: string): Promise<{
  dealerId: string | null;
  organizationId: string | null;
}> {
  const [dealerIds, orgIds] = await Promise.all([
    listOwnedDealerIds(userId),
    listMemberOrganizationIds(userId),
  ]);
  let organizationId: string | null = orgIds[0] ?? null;
  let dealerId: string | null = dealerIds[0] ?? null;
  if (!dealerId && organizationId) {
    const org = await prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: { legacyDealerId: true },
    });
    dealerId = org?.legacyDealerId ?? null;
  }
  return { dealerId, organizationId };
}

export async function assertUsableDealerId(userId: string, dealerId: string): Promise<string> {
  const allowed = await listOwnedDealerIds(userId);
  if (allowed.includes(dealerId)) return dealerId;

  const orgs = await listMemberOrganizationIds(userId);
  if (orgs.length) {
    const match = await prisma.organization.findFirst({
      where: {
        id: { in: orgs },
        legacyDealerId: dealerId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (match) return dealerId;
  }

  throw new CommunityError("Cannot attach this dealer to community content", 403, "FORGED_DEALER");
}

export async function assertUsableOrganizationId(userId: string, organizationId: string): Promise<string> {
  const allowed = await listMemberOrganizationIds(userId);
  if (allowed.includes(organizationId)) return organizationId;
  throw new CommunityError(
    "Cannot attach this organization to community content",
    403,
    "FORGED_ORGANIZATION",
  );
}

export async function resolvePostAffiliation(
  userId: string,
  requested: { dealerId?: string | null; organizationId?: string | null; inventoryId?: string | null },
): Promise<{ dealerId: string | null; organizationId: string | null; inventoryId: string | null }> {
  const owned = await resolveDealerAndOrgForUser(userId);

  let dealerId = owned.dealerId;
  let organizationId = owned.organizationId;

  if (requested.dealerId) {
    dealerId = await assertUsableDealerId(userId, requested.dealerId);
  }
  if (requested.organizationId) {
    organizationId = await assertUsableOrganizationId(userId, requested.organizationId);
  }

  let inventoryId: string | null = null;
  if (requested.inventoryId) {
    const inv = await prisma.newCarInventory.findFirst({
      where: { id: requested.inventoryId },
      select: { id: true, dealerId: true },
    });
    if (!inv) throw new CommunityError("Inventory not found", 404, "NOT_FOUND");
    if (!dealerId || inv.dealerId !== dealerId) {
      throw new CommunityError("Cannot attach this inventory to community content", 403, "FORGED_DEALER");
    }
    inventoryId = inv.id;
  }

  return { dealerId, organizationId, inventoryId };
}
