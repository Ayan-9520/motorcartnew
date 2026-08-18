import { randomUUID } from "node:crypto";
import { slugifyBase, randomSuffix } from "@/lib/growth/slug";
import type { OrganizationMemberRole, OrganizationType } from "./organization.types";
import { isOrganizationMemberRole } from "./organization.types";

export class OrganizationError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status = 400, code = "ORGANIZATION_ERROR") {
    super(message);
    this.name = "OrganizationError";
    this.status = status;
    this.code = code;
  }
}

export type OrgRecord = {
  id: string;
  type: OrganizationType;
  status: "active" | "pending" | "suspended" | "archived";
  name: string;
  displayName: string;
  slug: string;
  planSlug: string;
  legacyDealerId: string | null;
  typeMetadata: Record<string, unknown>;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type BranchRecord = {
  id: string;
  organizationId: string;
  name: string;
  isHeadquarters: boolean;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  contactNumber: string | null;
  businessHours: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MemberRecord = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  status: "invited" | "active" | "suspended" | "removed";
  branchId: string | null;
  department: string | null;
  permissions: string[];
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  email?: string | null;
  fullName?: string | null;
};

export type PartnerProfileRecord = {
  id: string;
  organizationId: string;
  businessName: string;
  displayName: string;
  logoUrl: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  rating: number;
  services: unknown[];
  categories: unknown[];
  businessHours: Record<string, unknown>;
  socialLinks: Record<string, unknown>;
  certifications: unknown[];
  createdAt: string;
  updatedAt: string;
};

export type EntitlementOverrideRecord = {
  featureKey: string;
  granted: boolean;
};

export type DealerSeed = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
};

export type UserSeed = {
  id: string;
  email: string | null;
  fullName: string;
  role: string;
};

export type OrganizationStore = {
  nowIso(): string;
  newId(): string;
  findOrgById(id: string): Promise<OrgRecord | null>;
  findOrgBySlug(slug: string): Promise<OrgRecord | null>;
  findOrgByLegacyDealerId(dealerId: string): Promise<OrgRecord | null>;
  insertOrg(row: OrgRecord): Promise<OrgRecord>;
  updateOrg(id: string, patch: Partial<OrgRecord>): Promise<OrgRecord>;
  findMembershipsByUserId(userId: string): Promise<MemberRecord[]>;
  findMembership(organizationId: string, userId: string): Promise<MemberRecord | null>;
  insertMember(row: MemberRecord): Promise<MemberRecord>;
  updateMember(id: string, patch: Partial<MemberRecord>): Promise<MemberRecord>;
  listMembers(organizationId: string): Promise<MemberRecord[]>;
  insertBranch(row: BranchRecord): Promise<BranchRecord>;
  updateBranch(id: string, patch: Partial<BranchRecord>): Promise<BranchRecord>;
  listBranches(organizationId: string): Promise<BranchRecord[]>;
  findBranch(id: string): Promise<BranchRecord | null>;
  getProfile(organizationId: string): Promise<PartnerProfileRecord | null>;
  upsertProfile(row: PartnerProfileRecord): Promise<PartnerProfileRecord>;
  listEntitlementOverrides(organizationId: string): Promise<EntitlementOverrideRecord[]>;
  findUserByEmail(email: string): Promise<UserSeed | null>;
  findUserById(id: string): Promise<UserSeed | null>;
  findDealerByOwnerId(ownerId: string): Promise<DealerSeed | null>;
};

export function uniqueOrgSlug(base: string): string {
  const stem = slugifyBase(base);
  return `${stem}-${randomSuffix(6)}`;
}

export function parseMemberRole(value: string | undefined, fallback: OrganizationMemberRole): OrganizationMemberRole {
  if (value && isOrganizationMemberRole(value)) return value;
  return fallback;
}

export function newIds(): { id: string; now: string } {
  return { id: randomUUID(), now: new Date().toISOString() };
}
