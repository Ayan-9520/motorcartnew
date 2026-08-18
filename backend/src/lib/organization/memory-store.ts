import { randomUUID } from "node:crypto";
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

export class MemoryOrganizationStore implements OrganizationStore {
  orgs = new Map<string, OrgRecord>();
  members = new Map<string, MemberRecord>();
  branches = new Map<string, BranchRecord>();
  profiles = new Map<string, PartnerProfileRecord>();
  overrides = new Map<string, EntitlementOverrideRecord[]>();
  users = new Map<string, UserSeed>();
  dealers: DealerSeed[] = [];

  nowIso(): string {
    return new Date().toISOString();
  }
  newId(): string {
    return randomUUID();
  }

  seedUser(user: UserSeed) {
    this.users.set(user.id, user);
  }
  seedDealer(dealer: DealerSeed) {
    this.dealers.push(dealer);
  }

  async findOrgById(id: string) {
    const row = this.orgs.get(id);
    return row && !row.deletedAt ? row : null;
  }
  async findOrgBySlug(slug: string) {
    return [...this.orgs.values()].find((o) => o.slug === slug && !o.deletedAt) ?? null;
  }
  async findOrgByLegacyDealerId(dealerId: string) {
    return [...this.orgs.values()].find((o) => o.legacyDealerId === dealerId && !o.deletedAt) ?? null;
  }
  async insertOrg(row: OrgRecord) {
    this.orgs.set(row.id, row);
    return row;
  }
  async updateOrg(id: string, patch: Partial<OrgRecord>) {
    const current = this.orgs.get(id);
    if (!current) throw new Error("NOT_FOUND");
    const next = { ...current, ...patch, updatedAt: this.nowIso() };
    this.orgs.set(id, next);
    return next;
  }
  async findMembershipsByUserId(userId: string) {
    return [...this.members.values()].filter((m) => m.userId === userId && m.status !== "removed");
  }
  async findMembership(organizationId: string, userId: string) {
    return (
      [...this.members.values()].find(
        (m) => m.organizationId === organizationId && m.userId === userId && m.status !== "removed",
      ) ?? null
    );
  }
  async insertMember(row: MemberRecord) {
    this.members.set(row.id, row);
    return row;
  }
  async updateMember(id: string, patch: Partial<MemberRecord>) {
    const current = this.members.get(id);
    if (!current) throw new Error("NOT_FOUND");
    const next = { ...current, ...patch, updatedAt: this.nowIso() };
    this.members.set(id, next);
    return next;
  }
  async listMembers(organizationId: string) {
    return [...this.members.values()]
      .filter((m) => m.organizationId === organizationId && m.status !== "removed")
      .map((m) => {
        const user = this.users.get(m.userId);
        return { ...m, email: user?.email ?? m.email ?? null, fullName: user?.fullName ?? m.fullName ?? null };
      });
  }
  async insertBranch(row: BranchRecord) {
    this.branches.set(row.id, row);
    return row;
  }
  async updateBranch(id: string, patch: Partial<BranchRecord>) {
    const current = this.branches.get(id);
    if (!current) throw new Error("NOT_FOUND");
    const next = { ...current, ...patch, updatedAt: this.nowIso() };
    this.branches.set(id, next);
    return next;
  }
  async listBranches(organizationId: string) {
    return [...this.branches.values()].filter((b) => b.organizationId === organizationId);
  }
  async findBranch(id: string) {
    return this.branches.get(id) ?? null;
  }
  async getProfile(organizationId: string) {
    return this.profiles.get(organizationId) ?? null;
  }
  async upsertProfile(row: PartnerProfileRecord) {
    this.profiles.set(row.organizationId, row);
    return row;
  }
  async listEntitlementOverrides(organizationId: string) {
    return this.overrides.get(organizationId) ?? [];
  }
  async findUserByEmail(email: string) {
    const lower = email.trim().toLowerCase();
    return [...this.users.values()].find((u) => u.email?.toLowerCase() === lower) ?? null;
  }
  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }
  async findDealerByOwnerId(ownerId: string) {
    return this.dealers.find((d) => d.ownerId === ownerId) ?? null;
  }
}
