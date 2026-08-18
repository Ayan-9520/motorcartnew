import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type {
  BranchRecord,
  DealerSeed,
  EntitlementOverrideRecord,
  MemberRecord,
  OrganizationStore,
  OrgRecord,
  PartnerProfileRecord,
  UserSeed,
} from "./organization.store";
import { OrganizationError } from "./organization.store";
import type { OrganizationMemberRole, OrganizationType } from "./organization.types";

function isMissingTable(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

function wrapMissing(error: unknown): never {
  if (isMissingTable(error)) {
    throw new OrganizationError(
      "Organization schema is not applied yet. Migration awaits approval.",
      503,
      "SCHEMA_NOT_APPLIED",
    );
  }
  throw error;
}

function mapOrg(row: {
  id: string;
  type: OrganizationType;
  status: OrgRecord["status"];
  name: string;
  displayName: string;
  slug: string;
  planSlug: string;
  legacyDealerId: string | null;
  typeMetadata: Prisma.JsonValue;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): OrgRecord {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    name: row.name,
    displayName: row.displayName,
    slug: row.slug,
    planSlug: row.planSlug,
    legacyDealerId: row.legacyDealerId,
    typeMetadata: (row.typeMetadata as Record<string, unknown>) ?? {},
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

function mapMember(row: {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  status: MemberRecord["status"];
  branchId: string | null;
  department: string | null;
  permissions: Prisma.JsonValue;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: { email: string | null; fullName: string } | null;
}): MemberRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    role: row.role,
    status: row.status,
    branchId: row.branchId,
    department: row.department,
    permissions: Array.isArray(row.permissions) ? row.permissions.map(String) : [],
    joinedAt: row.joinedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    email: row.user?.email ?? null,
    fullName: row.user?.fullName ?? null,
  };
}

function mapBranch(row: {
  id: string;
  organizationId: string;
  name: string;
  isHeadquarters: boolean;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postalCode: string | null;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  contactNumber: string | null;
  businessHours: Prisma.JsonValue;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): BranchRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    isHeadquarters: row.isHeadquarters,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    postalCode: row.postalCode,
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    contactNumber: row.contactNumber,
    businessHours: (row.businessHours as Record<string, unknown>) ?? {},
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaOrganizationStore implements OrganizationStore {
  nowIso(): string {
    return new Date().toISOString();
  }
  newId(): string {
    return randomUUID();
  }

  async findOrgById(id: string) {
    try {
      const row = await prisma.organization.findFirst({ where: { id, deletedAt: null } });
      return row ? mapOrg(row) : null;
    } catch (e) {
      wrapMissing(e);
    }
  }
  async findOrgBySlug(slug: string) {
    try {
      const row = await prisma.organization.findFirst({ where: { slug, deletedAt: null } });
      return row ? mapOrg(row) : null;
    } catch (e) {
      wrapMissing(e);
    }
  }
  async findOrgByLegacyDealerId(dealerId: string) {
    try {
      const row = await prisma.organization.findFirst({ where: { legacyDealerId: dealerId, deletedAt: null } });
      return row ? mapOrg(row) : null;
    } catch (e) {
      wrapMissing(e);
    }
  }
  async insertOrg(row: OrgRecord) {
    try {
      const created = await prisma.organization.create({
        data: {
          id: row.id,
          type: row.type,
          status: row.status,
          name: row.name,
          displayName: row.displayName,
          slug: row.slug,
          planSlug: row.planSlug,
          legacyDealerId: row.legacyDealerId,
          typeMetadata: row.typeMetadata as Prisma.InputJsonValue,
          createdByUserId: row.createdByUserId,
        },
      });
      return mapOrg(created);
    } catch (e) {
      wrapMissing(e);
    }
  }
  async updateOrg(id: string, patch: Partial<OrgRecord>) {
    try {
      const updated = await prisma.organization.update({
        where: { id },
        data: {
          ...(patch.name ? { name: patch.name } : {}),
          ...(patch.displayName ? { displayName: patch.displayName } : {}),
          ...(patch.planSlug ? { planSlug: patch.planSlug } : {}),
          ...(patch.status ? { status: patch.status } : {}),
        },
      });
      return mapOrg(updated);
    } catch (e) {
      wrapMissing(e);
    }
  }
  async findMembershipsByUserId(userId: string) {
    try {
      const rows = await prisma.organizationMember.findMany({
        where: { userId, status: { not: "removed" } },
        include: { user: { select: { email: true, fullName: true } } },
      });
      return rows.map(mapMember);
    } catch (e) {
      wrapMissing(e);
    }
  }
  async findMembership(organizationId: string, userId: string) {
    try {
      const row = await prisma.organizationMember.findFirst({
        where: { organizationId, userId, status: { not: "removed" } },
        include: { user: { select: { email: true, fullName: true } } },
      });
      return row ? mapMember(row) : null;
    } catch (e) {
      wrapMissing(e);
    }
  }
  async insertMember(row: MemberRecord) {
    try {
      const created = await prisma.organizationMember.create({
        data: {
          id: row.id,
          organizationId: row.organizationId,
          userId: row.userId,
          role: row.role,
          status: row.status,
          branchId: row.branchId,
          department: row.department,
          permissions: row.permissions as Prisma.InputJsonValue,
        },
        include: { user: { select: { email: true, fullName: true } } },
      });
      return mapMember(created);
    } catch (e) {
      wrapMissing(e);
    }
  }
  async updateMember(id: string, patch: Partial<MemberRecord>) {
    try {
      const updated = await prisma.organizationMember.update({
        where: { id },
        data: {
          ...(patch.role ? { role: patch.role } : {}),
          ...(patch.status ? { status: patch.status } : {}),
          ...(patch.branchId !== undefined ? { branchId: patch.branchId } : {}),
          ...(patch.department !== undefined ? { department: patch.department } : {}),
        },
        include: { user: { select: { email: true, fullName: true } } },
      });
      return mapMember(updated);
    } catch (e) {
      wrapMissing(e);
    }
  }
  async listMembers(organizationId: string) {
    try {
      const rows = await prisma.organizationMember.findMany({
        where: { organizationId, status: { not: "removed" } },
        include: { user: { select: { email: true, fullName: true } } },
        orderBy: { joinedAt: "asc" },
      });
      return rows.map(mapMember);
    } catch (e) {
      wrapMissing(e);
    }
  }
  async insertBranch(row: BranchRecord) {
    try {
      const created = await prisma.organizationBranch.create({
        data: {
          id: row.id,
          organizationId: row.organizationId,
          name: row.name,
          isHeadquarters: row.isHeadquarters,
          address: row.address,
          city: row.city,
          state: row.state,
          country: row.country,
          postalCode: row.postalCode,
          latitude: row.latitude,
          longitude: row.longitude,
          contactNumber: row.contactNumber,
          businessHours: row.businessHours as Prisma.InputJsonValue,
          isActive: row.isActive,
        },
      });
      return mapBranch(created);
    } catch (e) {
      wrapMissing(e);
    }
  }
  async updateBranch(id: string, patch: Partial<BranchRecord>) {
    try {
      const updated = await prisma.organizationBranch.update({
        where: { id },
        data: {
          ...(patch.name ? { name: patch.name } : {}),
          ...(patch.address !== undefined ? { address: patch.address } : {}),
          ...(patch.city !== undefined ? { city: patch.city } : {}),
          ...(patch.state !== undefined ? { state: patch.state } : {}),
          ...(patch.country ? { country: patch.country } : {}),
          ...(patch.postalCode !== undefined ? { postalCode: patch.postalCode } : {}),
          ...(patch.latitude !== undefined ? { latitude: patch.latitude } : {}),
          ...(patch.longitude !== undefined ? { longitude: patch.longitude } : {}),
          ...(patch.contactNumber !== undefined ? { contactNumber: patch.contactNumber } : {}),
          ...(patch.businessHours ? { businessHours: patch.businessHours as Prisma.InputJsonValue } : {}),
          ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
          ...(patch.isHeadquarters !== undefined ? { isHeadquarters: patch.isHeadquarters } : {}),
        },
      });
      return mapBranch(updated);
    } catch (e) {
      wrapMissing(e);
    }
  }
  async listBranches(organizationId: string) {
    try {
      const rows = await prisma.organizationBranch.findMany({
        where: { organizationId },
        orderBy: [{ isHeadquarters: "desc" }, { createdAt: "asc" }],
      });
      return rows.map(mapBranch);
    } catch (e) {
      wrapMissing(e);
    }
  }
  async findBranch(id: string) {
    try {
      const row = await prisma.organizationBranch.findUnique({ where: { id } });
      return row ? mapBranch(row) : null;
    } catch (e) {
      wrapMissing(e);
    }
  }
  async getProfile(organizationId: string) {
    try {
      const row = await prisma.partnerProfile.findUnique({ where: { organizationId } });
      if (!row) return null;
      return {
        id: row.id,
        organizationId: row.organizationId,
        businessName: row.businessName,
        displayName: row.displayName,
        logoUrl: row.logoUrl,
        description: row.description,
        email: row.email,
        phone: row.phone,
        website: row.website,
        verificationStatus: row.verificationStatus,
        rating: Number(row.rating),
        services: Array.isArray(row.services) ? row.services : [],
        categories: Array.isArray(row.categories) ? row.categories : [],
        businessHours: (row.businessHours as Record<string, unknown>) ?? {},
        socialLinks: (row.socialLinks as Record<string, unknown>) ?? {},
        certifications: Array.isArray(row.certifications) ? row.certifications : [],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      } satisfies PartnerProfileRecord;
    } catch (e) {
      wrapMissing(e);
    }
  }
  async upsertProfile(row: PartnerProfileRecord) {
    try {
      const saved = await prisma.partnerProfile.upsert({
        where: { organizationId: row.organizationId },
        create: {
          id: row.id,
          organizationId: row.organizationId,
          businessName: row.businessName,
          displayName: row.displayName,
          logoUrl: row.logoUrl,
          description: row.description,
          email: row.email,
          phone: row.phone,
          website: row.website,
          verificationStatus: row.verificationStatus,
          services: row.services as Prisma.InputJsonValue,
          categories: row.categories as Prisma.InputJsonValue,
          businessHours: row.businessHours as Prisma.InputJsonValue,
          socialLinks: row.socialLinks as Prisma.InputJsonValue,
          certifications: row.certifications as Prisma.InputJsonValue,
        },
        update: {
          businessName: row.businessName,
          displayName: row.displayName,
          logoUrl: row.logoUrl,
          description: row.description,
          email: row.email,
          phone: row.phone,
          website: row.website,
          services: row.services as Prisma.InputJsonValue,
          categories: row.categories as Prisma.InputJsonValue,
          businessHours: row.businessHours as Prisma.InputJsonValue,
          socialLinks: row.socialLinks as Prisma.InputJsonValue,
        },
      });
      const mapped = await this.getProfile(saved.organizationId);
      if (!mapped) throw new OrganizationError("Profile missing after upsert", 500, "PROFILE_ERROR");
      return mapped;
    } catch (e) {
      wrapMissing(e);
    }
  }
  async listEntitlementOverrides(organizationId: string): Promise<EntitlementOverrideRecord[]> {
    try {
      const rows = await prisma.organizationEntitlement.findMany({ where: { organizationId } });
      return rows.map((r) => ({ featureKey: r.featureKey, granted: r.granted }));
    } catch (e) {
      wrapMissing(e);
    }
  }
  async findUserByEmail(email: string): Promise<UserSeed | null> {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
      select: { id: true, email: true, fullName: true, role: true },
    });
    return user;
  }
  async findUserById(id: string): Promise<UserSeed | null> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, email: true, fullName: true, role: true },
    });
    return user;
  }
  async findDealerByOwnerId(ownerId: string): Promise<DealerSeed | null> {
    const dealer = await prisma.dealer.findFirst({
      where: { ownerId, deletedAt: null, slug: { not: "motorcart-unassigned" } },
      select: {
        id: true,
        ownerId: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        phone: true,
        email: true,
        website: true,
        description: true,
        logoUrl: true,
      },
    });
    return dealer;
  }
}
