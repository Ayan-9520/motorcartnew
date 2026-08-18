import {
  isBusinessAppRole,
  isPlatformAdminRole,
  organizationTypeFromAppRole,
  type OrganizationMemberRole,
  type OrganizationType,
} from "./organization.types";
import { hasOrganizationPermission, type OrganizationPermission } from "./permissions";
import {
  isPartnerFeatureKey,
  isPartnerPlanSlug,
  listFeatureEntitlements,
  resolveFeatureEntitlement,
  type PartnerFeatureKey,
  type PartnerPlanSlug,
} from "./entitlements";
import {
  OrganizationError,
  uniqueOrgSlug,
  type BranchRecord,
  type MemberRecord,
  type OrganizationStore,
  type OrgRecord,
  type PartnerProfileRecord,
} from "./organization.store";

export type Actor = { userId: string; role: string };

export type CreateOrganizationInput = {
  name: string;
  displayName?: string;
  type?: OrganizationType;
  planSlug?: string;
};

function requireName(name: string | undefined): string {
  const trimmed = (name ?? "").trim();
  if (trimmed.length < 2 || trimmed.length > 120) {
    throw new OrganizationError("Organization name must be between 2 and 120 characters", 400, "INVALID_NAME");
  }
  return trimmed;
}

export class OrganizationService {
  constructor(private readonly store: OrganizationStore) {}

  async createOrganization(actor: Actor, input: CreateOrganizationInput): Promise<OrgRecord> {
    if (!isBusinessAppRole(actor.role) && !isPlatformAdminRole(actor.role)) {
      throw new OrganizationError("Customers cannot create organizations", 403, "CUSTOMER_NOT_TENANT");
    }
    const type = input.type ?? organizationTypeFromAppRole(actor.role);
    if (!type) {
      throw new OrganizationError("This account type cannot create an organization", 403, "ROLE_NOT_BUSINESS");
    }
    const name = requireName(input.name);
    const now = this.store.nowIso();
    const org: OrgRecord = {
      id: this.store.newId(),
      type,
      status: "active",
      name,
      displayName: (input.displayName ?? name).trim(),
      slug: uniqueOrgSlug(name),
      planSlug: isPartnerPlanSlug(input.planSlug ?? "free") ? input.planSlug ?? "free" : "free",
      legacyDealerId: null,
      typeMetadata: {},
      createdByUserId: actor.userId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await this.store.insertOrg(org);
    await this.store.insertMember({
      id: this.store.newId(),
      organizationId: org.id,
      userId: actor.userId,
      role: "OWNER",
      status: "active",
      branchId: null,
      department: null,
      permissions: [],
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await this.store.insertBranch({
      id: this.store.newId(),
      organizationId: org.id,
      name: "Headquarters",
      isHeadquarters: true,
      address: null,
      city: null,
      state: null,
      country: "IN",
      postalCode: null,
      latitude: null,
      longitude: null,
      contactNumber: null,
      businessHours: {},
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    await this.store.upsertProfile(this.emptyProfile(org, now));
    return org;
  }

  async ensureForBusinessUser(actor: Actor): Promise<OrgRecord | null> {
    if (!isBusinessAppRole(actor.role)) return null;
    const memberships = await this.store.findMembershipsByUserId(actor.userId);
    if (memberships[0]) {
      const existing = await this.store.findOrgById(memberships[0].organizationId);
      if (existing) return existing;
    }
    const dealer = await this.store.findDealerByOwnerId(actor.userId);
    if (dealer) {
      const linked = await this.store.findOrgByLegacyDealerId(dealer.id);
      if (linked) {
        const already = await this.store.findMembership(linked.id, actor.userId);
        if (!already) {
          const now = this.store.nowIso();
          await this.store.insertMember({
            id: this.store.newId(),
            organizationId: linked.id,
            userId: actor.userId,
            role: "OWNER",
            status: "active",
            branchId: null,
            department: null,
            permissions: [],
            joinedAt: now,
            createdAt: now,
            updatedAt: now,
          });
        }
        return linked;
      }
      return this.provisionFromDealer(actor, dealer);
    }
    return this.createOrganization(actor, { name: "My organization" });
  }

  async listMine(actor: Actor): Promise<OrgRecord[]> {
    if (isPlatformAdminRole(actor.role)) {
      /* Admins use get-by-id; list remains membership-scoped to avoid a global dump. */
    }
    const memberships = await this.store.findMembershipsByUserId(actor.userId);
    const orgs: OrgRecord[] = [];
    for (const m of memberships) {
      const org = await this.store.findOrgById(m.organizationId);
      if (org) orgs.push(org);
    }
    return orgs;
  }

  async getOrganization(actor: Actor, organizationId: string): Promise<OrgRecord> {
    const org = await this.store.findOrgById(organizationId);
    if (!org) throw new OrganizationError("Organization not found", 404, "NOT_FOUND");
    await this.requireMembership(actor, org.id, "organization.read");
    return org;
  }

  async updateOrganization(
    actor: Actor,
    organizationId: string,
    patch: { name?: string; displayName?: string },
  ): Promise<OrgRecord> {
    const org = await this.getOrganization(actor, organizationId);
    await this.requireMembership(actor, org.id, "organization.update");
    const next: Partial<OrgRecord> = {};
    if (patch.name) next.name = requireName(patch.name);
    if (patch.displayName) next.displayName = patch.displayName.trim().slice(0, 120);
    return this.store.updateOrg(org.id, next);
  }

  async listMembers(actor: Actor, organizationId: string): Promise<MemberRecord[]> {
    await this.requireMembership(actor, organizationId, "organization.read");
    return this.store.listMembers(organizationId);
  }

  async addMember(
    actor: Actor,
    organizationId: string,
    input: { email: string; role?: string; branchId?: string; department?: string },
  ): Promise<MemberRecord> {
    await this.requireMembership(actor, organizationId, "team.manage");
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@")) throw new OrganizationError("A valid email is required", 400, "INVALID_EMAIL");
    const user = await this.store.findUserByEmail(email);
    if (!user) {
      throw new OrganizationError("User must already have a MotorCart account", 400, "USER_NOT_FOUND");
    }
    if (user.role === "customer") {
      throw new OrganizationError("Customers cannot be added as organization members", 400, "CUSTOMER_NOT_MEMBER");
    }
    const existing = await this.store.findMembership(organizationId, user.id);
    if (existing) throw new OrganizationError("User is already a member", 409, "ALREADY_MEMBER");
    let branchId: string | null = input.branchId ?? null;
    if (branchId) {
      const branch = await this.store.findBranch(branchId);
      if (!branch || branch.organizationId !== organizationId) {
        throw new OrganizationError("Branch not found", 404, "BRANCH_NOT_FOUND");
      }
    }
    const role: OrganizationMemberRole =
      input.role && ["OWNER", "ADMIN", "MANAGER", "SALES", "FINANCE", "INSURANCE", "SERVICE", "PARTS", "OPERATIONS", "CALL_AGENT", "MARKETING", "VIEWER"].includes(input.role)
        ? (input.role as OrganizationMemberRole)
        : "VIEWER";
    if (role === "OWNER") {
      const actorMember = await this.store.findMembership(organizationId, actor.userId);
      if (actorMember?.role !== "OWNER" && !isPlatformAdminRole(actor.role)) {
        throw new OrganizationError("Only an owner can grant OWNER", 403, "FORBIDDEN");
      }
    }
    const now = this.store.nowIso();
    return this.store.insertMember({
      id: this.store.newId(),
      organizationId,
      userId: user.id,
      role,
      status: "active",
      branchId,
      department: input.department?.trim() || null,
      permissions: [],
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
      email: user.email,
      fullName: user.fullName,
    });
  }

  async updateMember(
    actor: Actor,
    organizationId: string,
    memberId: string,
    patch: { role?: string; status?: "active" | "suspended" | "removed"; branchId?: string | null; department?: string | null },
  ): Promise<MemberRecord> {
    await this.requireMembership(actor, organizationId, "team.manage");
    const members = await this.store.listMembers(organizationId);
    const member = members.find((m) => m.id === memberId);
    if (!member) throw new OrganizationError("Member not found", 404, "NOT_FOUND");

    const allowedRoles = [
      "OWNER",
      "ADMIN",
      "MANAGER",
      "SALES",
      "FINANCE",
      "INSURANCE",
      "SERVICE",
      "PARTS",
      "OPERATIONS",
      "CALL_AGENT",
      "MARKETING",
      "VIEWER",
    ] as const;
    const roleIsValid = patch.role ? allowedRoles.includes(patch.role as (typeof allowedRoles)[number]) : true;
    const nextRole = patch.role && roleIsValid ? (patch.role as OrganizationMemberRole) : member.role;
    const nextStatus = patch.status ?? member.status;
    const isOwnerBeingChangedAwayFromActive = member.role === "OWNER" && (nextRole !== "OWNER" || nextStatus !== "active");

    if (isOwnerBeingChangedAwayFromActive) {
      if (actor.userId === member.userId) {
        throw new OrganizationError("Owners cannot demote or remove themselves", 403, "OWNER_SELF_DEMOTION_FORBIDDEN");
      }
      const remainingActiveOwners = members.filter(
        (m) => m.id !== memberId && m.role === "OWNER" && m.status === "active",
      ).length;
      if (remainingActiveOwners === 0) {
        throw new OrganizationError("Cannot change the last active organization owner", 403, "LAST_OWNER_PROTECTION");
      }
    }

    const next: Partial<MemberRecord> = {};
    if (patch.role) {
      if (patch.role === "OWNER" && member.role !== "OWNER") {
        const actorMember = await this.store.findMembership(organizationId, actor.userId);
        if (actorMember?.role !== "OWNER" && !isPlatformAdminRole(actor.role)) {
          throw new OrganizationError("Only an owner can grant OWNER", 403, "FORBIDDEN");
        }
      }
      if (
        ![
          "OWNER",
          "ADMIN",
          "MANAGER",
          "SALES",
          "FINANCE",
          "INSURANCE",
          "SERVICE",
          "PARTS",
          "OPERATIONS",
          "CALL_AGENT",
          "MARKETING",
          "VIEWER",
        ].includes(patch.role)
      ) {
        throw new OrganizationError("Unknown role", 400, "INVALID_ROLE");
      }
      next.role = patch.role as OrganizationMemberRole;
    }
    if (patch.status) next.status = patch.status;
    if (patch.branchId !== undefined) {
      if (patch.branchId) {
        const branch = await this.store.findBranch(patch.branchId);
        if (!branch || branch.organizationId !== organizationId) {
          throw new OrganizationError("Branch not found", 404, "BRANCH_NOT_FOUND");
        }
      }
      next.branchId = patch.branchId;
    }
    if (patch.department !== undefined) next.department = patch.department;
    return this.store.updateMember(memberId, next);
  }

  async listBranches(actor: Actor, organizationId: string): Promise<BranchRecord[]> {
    await this.requireMembership(actor, organizationId, "organization.read");
    return this.store.listBranches(organizationId);
  }

  async createBranch(
    actor: Actor,
    organizationId: string,
    input: {
      name: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
      latitude?: number;
      longitude?: number;
      contactNumber?: string;
      businessHours?: Record<string, unknown>;
      isHeadquarters?: boolean;
    },
  ): Promise<BranchRecord> {
    await this.requireMembership(actor, organizationId, "branch.manage");
    const name = (input.name ?? "").trim();
    if (name.length < 2) throw new OrganizationError("Branch name is required", 400, "INVALID_NAME");
    const now = this.store.nowIso();
    return this.store.insertBranch({
      id: this.store.newId(),
      organizationId,
      name,
      isHeadquarters: Boolean(input.isHeadquarters),
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      country: (input.country ?? "IN").trim() || "IN",
      postalCode: input.postalCode?.trim() || null,
      latitude: typeof input.latitude === "number" ? input.latitude : null,
      longitude: typeof input.longitude === "number" ? input.longitude : null,
      contactNumber: input.contactNumber?.trim() || null,
      businessHours: input.businessHours ?? {},
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateBranch(actor: Actor, organizationId: string, branchId: string, patch: Partial<BranchRecord>): Promise<BranchRecord> {
    await this.requireMembership(actor, organizationId, "branch.manage");
    const branch = await this.store.findBranch(branchId);
    if (!branch || branch.organizationId !== organizationId) {
      throw new OrganizationError("Branch not found", 404, "NOT_FOUND");
    }
    return this.store.updateBranch(branchId, patch);
  }

  async getProfile(actor: Actor, organizationId: string): Promise<PartnerProfileRecord> {
    await this.requireMembership(actor, organizationId, "organization.read");
    const existing = await this.store.getProfile(organizationId);
    if (existing) return existing;
    const org = await this.store.findOrgById(organizationId);
    if (!org) throw new OrganizationError("Organization not found", 404, "NOT_FOUND");
    return this.store.upsertProfile(this.emptyProfile(org, this.store.nowIso()));
  }

  async updateProfile(
    actor: Actor,
    organizationId: string,
    patch: Partial<Pick<PartnerProfileRecord, "businessName" | "displayName" | "logoUrl" | "description" | "email" | "phone" | "website" | "services" | "categories" | "businessHours" | "socialLinks">>,
  ): Promise<PartnerProfileRecord> {
    await this.requireMembership(actor, organizationId, "organization.update");
    const current = await this.getProfile(actor, organizationId);
    return this.store.upsertProfile({
      ...current,
      ...patch,
      updatedAt: this.store.nowIso(),
    });
  }

  async entitlements(actor: Actor, organizationId: string) {
    const org = await this.getOrganization(actor, organizationId);
    const plan = (isPartnerPlanSlug(org.planSlug) ? org.planSlug : "free") as PartnerPlanSlug;
    const overrides = await this.store.listEntitlementOverrides(organizationId);
    return {
      plan,
      features: listFeatureEntitlements(plan, overrides),
    };
  }

  async assertFeature(actor: Actor, organizationId: string, featureKey: string): Promise<{ allowed: true; feature: PartnerFeatureKey }> {
    await this.requireMembership(actor, organizationId, "organization.read");
    if (!isPartnerFeatureKey(featureKey)) {
      throw new OrganizationError("Unknown feature", 400, "UNKNOWN_FEATURE");
    }
    const org = await this.store.findOrgById(organizationId);
    if (!org) throw new OrganizationError("Organization not found", 404, "NOT_FOUND");
    const plan = (isPartnerPlanSlug(org.planSlug) ? org.planSlug : "free") as PartnerPlanSlug;
    const overrides = await this.store.listEntitlementOverrides(organizationId);
    const allowed = resolveFeatureEntitlement(plan, featureKey, overrides);
    if (!allowed) {
      throw new OrganizationError("Upgrade to unlock this feature", 403, "FEATURE_LOCKED");
    }
    return { allowed: true, feature: featureKey };
  }

  async requireMembership(actor: Actor, organizationId: string, permission: OrganizationPermission): Promise<MemberRecord | null> {
    if (isPlatformAdminRole(actor.role)) return null;
    const member = await this.store.findMembership(organizationId, actor.userId);
    if (!member || member.status !== "active") {
      throw new OrganizationError("Forbidden", 403, "CROSS_ORGANIZATION");
    }
    if (!hasOrganizationPermission(member.role, permission, member.permissions)) {
      throw new OrganizationError("Forbidden", 403, "MISSING_PERMISSION");
    }
    return member;
  }

  private emptyProfile(org: OrgRecord, now: string): PartnerProfileRecord {
    return {
      id: this.store.newId(),
      organizationId: org.id,
      businessName: org.name,
      displayName: org.displayName,
      logoUrl: null,
      description: null,
      email: null,
      phone: null,
      website: null,
      verificationStatus: "unverified",
      rating: 0,
      services: [],
      categories: [],
      businessHours: {},
      socialLinks: {},
      certifications: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  private async provisionFromDealer(
    actor: Actor,
    dealer: {
      id: string;
      name: string;
      city: string;
      state: string;
      phone: string | null;
      email: string | null;
      website: string | null;
      description: string | null;
      logoUrl: string | null;
    },
  ): Promise<OrgRecord> {
    const now = this.store.nowIso();
    const org: OrgRecord = {
      id: this.store.newId(),
      type: "DEALER",
      status: "active",
      name: dealer.name,
      displayName: dealer.name,
      slug: uniqueOrgSlug(dealer.name),
      planSlug: "free",
      legacyDealerId: dealer.id,
      typeMetadata: { provisionedFrom: "dealer" },
      createdByUserId: actor.userId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await this.store.insertOrg(org);
    const branch = await this.store.insertBranch({
      id: this.store.newId(),
      organizationId: org.id,
      name: "Headquarters",
      isHeadquarters: true,
      address: null,
      city: dealer.city,
      state: dealer.state,
      country: "IN",
      postalCode: null,
      latitude: null,
      longitude: null,
      contactNumber: dealer.phone,
      businessHours: {},
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    await this.store.insertMember({
      id: this.store.newId(),
      organizationId: org.id,
      userId: actor.userId,
      role: "OWNER",
      status: "active",
      branchId: branch.id,
      department: null,
      permissions: [],
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await this.store.upsertProfile({
      ...this.emptyProfile(org, now),
      email: dealer.email,
      phone: dealer.phone,
      website: dealer.website,
      description: dealer.description,
      logoUrl: dealer.logoUrl,
    });
    return org;
  }
}
