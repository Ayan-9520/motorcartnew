import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MemoryOrganizationStore } from "./memory-store";
import { OrganizationService } from "./organization.service";
import { OrganizationError } from "./organization.store";
import { hasOrganizationPermission } from "./permissions";
import { resolveFeatureEntitlement } from "./entitlements";
import { organizationTypeFromAppRole } from "./organization.types";
import { validateEnquiryInput } from "@/lib/leads/enquiry.validation";
import { NEVER_ALLOW_TABLES, authorizeLegacyQuery } from "@/lib/db/query-allowlist";

function setup() {
  const store = new MemoryOrganizationStore();
  store.seedUser({ id: "owner-1", email: "dealer@example.com", fullName: "Devi Owner", role: "dealer" });
  store.seedUser({ id: "sales-1", email: "sales@example.com", fullName: "Sam Sales", role: "dealer" });
  store.seedUser({ id: "customer-1", email: "buyer@example.com", fullName: "Cara Customer", role: "customer" });
  store.seedUser({ id: "platform-1", email: "platform@example.com", fullName: "Platform Admin", role: "super_admin" });
  store.seedUser({ id: "other-owner", email: "other@example.com", fullName: "Omar Other", role: "dealer" });
  store.seedDealer({
    id: "dealer-1",
    ownerId: "owner-1",
    name: "City Motors",
    slug: "city-motors",
    city: "Pune",
    state: "Maharashtra",
    phone: "9999999999",
    email: "dealer@example.com",
    website: null,
    description: null,
    logoUrl: null,
  });
  const service = new OrganizationService(store);
  return { store, service };
}

describe("Phase 3 organization foundation", () => {
  it("creates an organization", async () => {
    const { service } = setup();
    const org = await service.createOrganization(
      { userId: "owner-1", role: "dealer" },
      { name: "City Motors Org" },
    );
    assert.equal(org.type, "DEALER");
    assert.equal(org.planSlug, "free");
    assert.ok(org.slug);
  });

  it("retrieves organization profile", async () => {
    const { service } = setup();
    const org = await service.createOrganization(
      { userId: "owner-1", role: "dealer" },
      { name: "City Motors Org" },
    );
    const profile = await service.getProfile({ userId: "owner-1", role: "dealer" }, org.id);
    assert.equal(profile.businessName, "City Motors Org");
    assert.equal(profile.verificationStatus, "unverified");
  });

  it("adds organization membership with a role", async () => {
    const { service } = setup();
    const org = await service.createOrganization(
      { userId: "owner-1", role: "dealer" },
      { name: "City Motors Org" },
    );
    const member = await service.addMember({ userId: "owner-1", role: "dealer" }, org.id, {
      email: "sales@example.com",
      role: "SALES",
    });
    assert.equal(member.role, "SALES");
    assert.equal(member.userId, "sales-1");
    const members = await service.listMembers({ userId: "owner-1", role: "dealer" }, org.id);
    assert.equal(members.length, 2);
  });

  it("checks member permissions by role", () => {
    assert.equal(hasOrganizationPermission("SALES", "lead.read"), true);
    assert.equal(hasOrganizationPermission("SALES", "team.manage"), false);
    assert.equal(hasOrganizationPermission("VIEWER", "inventory.delete"), false);
    assert.equal(hasOrganizationPermission("OWNER", "team.manage"), true);
  });

  it("creates a branch and assigns a user to it", async () => {
    const { service } = setup();
    const org = await service.createOrganization(
      { userId: "owner-1", role: "dealer" },
      { name: "City Motors Org" },
    );
    const branch = await service.createBranch({ userId: "owner-1", role: "dealer" }, org.id, {
      name: "Pune Showroom",
      city: "Pune",
      state: "Maharashtra",
      postalCode: "411001",
    });
    const member = await service.addMember({ userId: "owner-1", role: "dealer" }, org.id, {
      email: "sales@example.com",
      role: "SALES",
      branchId: branch.id,
    });
    assert.equal(member.branchId, branch.id);
    const branches = await service.listBranches({ userId: "owner-1", role: "dealer" }, org.id);
    assert.ok(branches.some((b) => b.name === "Pune Showroom"));
  });

  it("blocks unauthorized organization access", async () => {
    const { service } = setup();
    const org = await service.createOrganization(
      { userId: "owner-1", role: "dealer" },
      { name: "City Motors Org" },
    );
    await assert.rejects(
      () => service.getOrganization({ userId: "customer-1", role: "customer" }, org.id),
      (e: unknown) => e instanceof OrganizationError && e.status === 403,
    );
  });

  it("blocks cross-organization data access", async () => {
    const { service } = setup();
    const a = await service.createOrganization({ userId: "owner-1", role: "dealer" }, { name: "Org A" });
    await service.createOrganization({ userId: "other-owner", role: "dealer" }, { name: "Org B" });
    await assert.rejects(
      () => service.listMembers({ userId: "other-owner", role: "dealer" }, a.id),
      (e: unknown) => e instanceof OrganizationError && e.code === "CROSS_ORGANIZATION",
    );
  });

  it("returns partner profile for members", async () => {
    const { service } = setup();
    const org = await service.ensureForBusinessUser({ userId: "owner-1", role: "dealer" });
    assert.ok(org);
    const profile = await service.getProfile({ userId: "owner-1", role: "dealer" }, org.id);
    assert.equal(profile.organizationId, org.id);
    assert.equal(org.legacyDealerId, "dealer-1");
  });

  it("allows entitled features and denies locked ones", async () => {
    const { service } = setup();
    const org = await service.createOrganization({ userId: "owner-1", role: "dealer" }, { name: "Org" });
    const ok = await service.assertFeature({ userId: "owner-1", role: "dealer" }, org.id, "lead_management");
    assert.equal(ok.allowed, true);
    await assert.rejects(
      () => service.assertFeature({ userId: "owner-1", role: "dealer" }, org.id, "lead_board"),
      (e: unknown) => e instanceof OrganizationError && e.code === "FEATURE_LOCKED",
    );
    await assert.rejects(
      () => service.assertFeature({ userId: "owner-1", role: "dealer" }, org.id, "bulk_excel_upload"),
      (e: unknown) => e instanceof OrganizationError && e.code === "FEATURE_LOCKED",
    );
  });

  it("does not convert customers into business tenants", async () => {
    const { service } = setup();
    const ensured = await service.ensureForBusinessUser({ userId: "customer-1", role: "customer" });
    assert.equal(ensured, null);
    await assert.rejects(
      () => service.createOrganization({ userId: "customer-1", role: "customer" }, { name: "Not a dealer" }),
      (e: unknown) => e instanceof OrganizationError && e.code === "CUSTOMER_NOT_TENANT",
    );
  });

  it("keeps existing customer enquiry validation working", () => {
    const result = validateEnquiryInput({
      name: "Cara Customer",
      phone: "9876543210",
      consent: true,
    });
    assert.equal(result.ok, true);
  });

  it("maps existing dealer AppRoles without rewriting them", () => {
    assert.equal(organizationTypeFromAppRole("dealer"), "DEALER");
    assert.equal(organizationTypeFromAppRole("new_car_dealer"), "DEALER");
    assert.equal(organizationTypeFromAppRole("customer"), null);
    assert.equal(organizationTypeFromAppRole("bank_nbfc"), "BANK");
  });

  it("prevents self-demotion of the last active owner", async () => {
    const { service } = setup();
    const actorOwner = { userId: "owner-1", role: "dealer" };
    const org = await service.createOrganization(actorOwner, { name: "Org" });
    const members = await service.listMembers(actorOwner, org.id);
    const ownerMember = members.find((m) => m.userId === "owner-1" && m.role === "OWNER");
    assert.ok(ownerMember);
    await assert.rejects(
      () => service.updateMember(actorOwner, org.id, ownerMember!.id, { role: "ADMIN" }),
      (e: unknown) => e instanceof OrganizationError && e.code === "OWNER_SELF_DEMOTION_FORBIDDEN",
    );
  });

  it("prevents demoting the last active owner even for platform admin", async () => {
    const { service } = setup();
    const actorOwner = { userId: "owner-1", role: "dealer" };
    const actorPlatform = { userId: "platform-1", role: "super_admin" };
    const org = await service.createOrganization(actorOwner, { name: "Org" });
    const members = await service.listMembers(actorOwner, org.id);
    const ownerMember = members.find((m) => m.userId === "owner-1" && m.role === "OWNER");
    assert.ok(ownerMember);
    await assert.rejects(
      () => service.updateMember(actorPlatform, org.id, ownerMember!.id, { role: "ADMIN" }),
      (e: unknown) => e instanceof OrganizationError && e.code === "LAST_OWNER_PROTECTION",
    );
  });

  it("allows demoting a non-self owner when another active owner remains", async () => {
    const { service } = setup();
    const actorOwner = { userId: "owner-1", role: "dealer" };
    const org = await service.createOrganization(actorOwner, { name: "Org" });
    await service.addMember(actorOwner, org.id, { email: "other@example.com", role: "OWNER" });

    const members = await service.listMembers(actorOwner, org.id);
    const otherOwner = members.find((m) => m.userId === "other-owner" && m.role === "OWNER");
    assert.ok(otherOwner);

    const updated = await service.updateMember(actorOwner, org.id, otherOwner.id, { role: "ADMIN" });
    assert.equal(updated.role, "ADMIN");
  });

  it("never exposes organization tables on /api/db/query", () => {
    assert.equal(NEVER_ALLOW_TABLES.has("organizations"), true);
    const decision = authorizeLegacyQuery(
      { userId: "owner-1", role: "super_admin" },
      { table: "organizations", action: "select" },
      new Set(["organizations"]),
    );
    assert.equal(decision.ok, false);
  });

  it("phase-locked features stay denied even on enterprise plan math", () => {
    assert.equal(resolveFeatureEntitlement("enterprise", "lead_board"), false);
    assert.equal(resolveFeatureEntitlement("enterprise", "paid_leads"), false);
    assert.equal(resolveFeatureEntitlement("enterprise", "dialer"), false);
    assert.equal(resolveFeatureEntitlement("pro", "analytics"), true);
  });
});
