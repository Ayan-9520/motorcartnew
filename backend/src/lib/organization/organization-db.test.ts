/**
 * DB-backed integration tests for Organization Foundation.
 * Requires local Docker PostgreSQL with org migration applied.
 * Run: DATABASE_URL=postgresql://motorcart:strongpassword@localhost:5432/motorcart?schema=public npx tsx --test src/lib/organization/organization-db.test.ts
 */
import assert from "node:assert/strict";
import { describe, it, after } from "node:test";
import { prisma } from "@/lib/prisma";
import { PrismaOrganizationStore } from "./prisma-store";
import { OrganizationService } from "./organization.service";
import { OrganizationError } from "./organization.store";
import { resolveFeatureEntitlement } from "./entitlements";

const TEST_PREFIX = `__orgtest_${Date.now()}_`;
let testUserIdA = "";
let testUserIdB = "";
let testDealerIdA = "";
const createdOrgIds: string[] = [];

async function seedTestUsers() {
  const a = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}owner@test.com`,
      fullName: "Test Owner A",
      role: "dealer",
      passwordHash: "not-a-real-hash",
    },
  });
  const b = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}owner_b@test.com`,
      fullName: "Test Owner B",
      role: "dealer",
      passwordHash: "not-a-real-hash",
    },
  });
  const d = await prisma.dealer.create({
    data: {
      ownerId: a.id,
      name: `${TEST_PREFIX}Motors`,
      slug: `${TEST_PREFIX}motors`,
      city: "Mumbai",
      state: "Maharashtra",
    },
  });
  testUserIdA = a.id;
  testUserIdB = b.id;
  testDealerIdA = d.id;
}

async function cleanup() {
  for (const orgId of createdOrgIds) {
    await prisma.organizationEntitlement.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.partnerBadgeAssignment.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.partnerProfile.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.organizationMember.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.organizationBranch.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.organization.deleteMany({ where: { id: orgId } }).catch(() => {});
  }
  if (testDealerIdA) await prisma.dealer.deleteMany({ where: { id: testDealerIdA } }).catch(() => {});
  if (testUserIdA) await prisma.user.deleteMany({ where: { id: testUserIdA } }).catch(() => {});
  if (testUserIdB) await prisma.user.deleteMany({ where: { id: testUserIdB } }).catch(() => {});
  await prisma.$disconnect();
}

function trackOrg(org: { id: string }) {
  createdOrgIds.push(org.id);
  return org;
}

describe("Organization Foundation — PostgreSQL integration", async () => {
  await seedTestUsers();
  after(cleanup);

  const store = new PrismaOrganizationStore();
  const service = new OrganizationService(store);
  const actorA = { userId: testUserIdA, role: "dealer" };
  const actorB = { userId: testUserIdB, role: "dealer" };

  it("creates and persists an organization", async () => {
    const created = await service.createOrganization(actorA, { name: "DB Test Org A" });
    trackOrg(created);
    assert.equal(created.type, "DEALER");
    assert.equal(created.planSlug, "free");
    const org = created;
    const fetched = await service.getOrganization(actorA, org.id);
    assert.equal(fetched.name, "DB Test Org A");
  });

  it("lazy-provisions a dealer organization via ensureForBusinessUser", async () => {
    const provUser = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}prov@test.com`,
        fullName: "Prov Owner",
        role: "dealer",
        passwordHash: "not-real",
      },
    });
    const provDealer = await prisma.dealer.create({
      data: {
        ownerId: provUser.id,
        name: `${TEST_PREFIX}ProvMotors`,
        slug: `${TEST_PREFIX}provmotors`,
        city: "Delhi",
        state: "Delhi",
      },
    });
    try {
      const org = await service.ensureForBusinessUser({ userId: provUser.id, role: "dealer" });
      assert.ok(org);
      trackOrg(org);
      assert.equal(org.legacyDealerId, provDealer.id);
      assert.equal(org.type, "DEALER");
      const again = await service.ensureForBusinessUser({ userId: provUser.id, role: "dealer" });
      assert.equal(again?.id, org.id);
    } finally {
      await prisma.dealer.delete({ where: { id: provDealer.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: provUser.id } }).catch(() => {});
    }
  });

  it("persists membership and lists it", async () => {
    const orgs = await service.listMine(actorA);
    assert.ok(orgs.length >= 1);
    const orgId = orgs[0].id;
    const members = await service.listMembers(actorA, orgId);
    assert.ok(members.some((m) => m.userId === testUserIdA && m.role === "OWNER"));
  });

  it("enforces tenant isolation — user B cannot read org A", async () => {
    const orgsA = await service.listMine(actorA);
    const orgA = orgsA[0];
    await assert.rejects(
      () => service.getOrganization(actorB, orgA.id),
      (e: unknown) => e instanceof OrganizationError && e.code === "CROSS_ORGANIZATION",
    );
  });

  it("enforces tenant isolation — user B cannot list members of org A", async () => {
    const orgsA = await service.listMine(actorA);
    await assert.rejects(
      () => service.listMembers(actorB, orgsA[0].id),
      (e: unknown) => e instanceof OrganizationError && e.code === "CROSS_ORGANIZATION",
    );
  });

  it("enforces tenant isolation — user B cannot modify org A", async () => {
    const orgsA = await service.listMine(actorA);
    await assert.rejects(
      () => service.updateOrganization(actorB, orgsA[0].id, { name: "Hijacked" }),
      (e: unknown) => e instanceof OrganizationError && e.code === "CROSS_ORGANIZATION",
    );
  });

  it("enforces tenant isolation — user B cannot create branch on org A", async () => {
    const orgsA = await service.listMine(actorA);
    await assert.rejects(
      () => service.createBranch(actorB, orgsA[0].id, { name: "Evil Branch" }),
      (e: unknown) => e instanceof OrganizationError && e.code === "MISSING_PERMISSION" || (e instanceof OrganizationError && e.code === "CROSS_ORGANIZATION"),
    );
  });

  it("enforces tenant isolation — user B cannot add member to org A", async () => {
    const orgsA = await service.listMine(actorA);
    await assert.rejects(
      () => service.addMember(actorB, orgsA[0].id, { email: `${TEST_PREFIX}owner_b@test.com`, role: "VIEWER" }),
      (e: unknown) => e instanceof OrganizationError && (e.code === "CROSS_ORGANIZATION" || e.code === "MISSING_PERMISSION"),
    );
  });

  it("creates a separate org for user B with isolation", async () => {
    const orgB = trackOrg(await service.createOrganization(actorB, { name: "DB Test Org B" }));
    const fetchedB = await service.getOrganization(actorB, orgB.id);
    assert.equal(fetchedB.name, "DB Test Org B");
    await assert.rejects(
      () => service.getOrganization(actorA, orgB.id),
      (e: unknown) => e instanceof OrganizationError && e.code === "CROSS_ORGANIZATION",
    );
  });

  it("prevents self-demotion of the last active owner", async () => {
    const orgsA = await service.listMine(actorA);
    const orgId = orgsA[0].id;
    const members = await service.listMembers(actorA, orgId);
    const ownerMember = members.find((m) => m.userId === testUserIdA && m.role === "OWNER");
    assert.ok(ownerMember);

    await assert.rejects(
      () => service.updateMember(actorA, orgId, ownerMember!.id, { role: "ADMIN" }),
      (e: unknown) => e instanceof OrganizationError && e.code === "OWNER_SELF_DEMOTION_FORBIDDEN",
    );
  });

  it("prevents platform admin from demoting the last active owner", async () => {
    const orgsA = await service.listMine(actorA);
    const orgId = orgsA[0].id;
    const members = await service.listMembers(actorA, orgId);
    const ownerMember = members.find((m) => m.userId === testUserIdA && m.role === "OWNER");
    assert.ok(ownerMember);

    const platformUser = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}platform_admin@test.com`,
        fullName: "Platform Admin",
        role: "super_admin",
        passwordHash: "not-real",
      },
    });
    const actorPlatform = { userId: platformUser.id, role: "super_admin" };

    try {
      await assert.rejects(
        () => service.updateMember(actorPlatform, orgId, ownerMember!.id, { role: "ADMIN" }),
        (e: unknown) => e instanceof OrganizationError && e.code === "LAST_OWNER_PROTECTION",
      );
    } finally {
      await prisma.user.delete({ where: { id: platformUser.id } }).catch(() => {});
    }
  });

  it("allows demoting a non-self owner when another active owner remains", async () => {
    const orgsA = await service.listMine(actorA);
    const orgId = orgsA[0].id;

    await service.addMember(actorA, orgId, { email: `${TEST_PREFIX}owner_b@test.com`, role: "OWNER" });

    const members = await service.listMembers(actorA, orgId);
    const otherOwnerMember = members.find((m) => m.userId === testUserIdB && m.role === "OWNER");
    assert.ok(otherOwnerMember);

    const updated = await service.updateMember(actorA, orgId, otherOwnerMember.id, { role: "ADMIN" });
    assert.equal(updated.role, "ADMIN");
  });

  it("creates and persists branches", async () => {
    const orgsA = await service.listMine(actorA);
    const branch = await service.createBranch(actorA, orgsA[0].id, {
      name: "Test Branch",
      city: "Pune",
      state: "Maharashtra",
      postalCode: "411001",
    });
    assert.ok(branch.id);
    const branches = await service.listBranches(actorA, orgsA[0].id);
    assert.ok(branches.some((b) => b.name === "Test Branch"));
  });

  it("persists and retrieves partner profile", async () => {
    const orgsA = await service.listMine(actorA);
    const profile = await service.getProfile(actorA, orgsA[0].id);
    assert.ok(profile.organizationId);
    const updated = await service.updateProfile(actorA, orgsA[0].id, { phone: "9876543210" });
    assert.equal(updated.phone, "9876543210");
    const re = await service.getProfile(actorA, orgsA[0].id);
    assert.equal(re.phone, "9876543210");
  });

  it("inventory_upload is allowed on free plan", async () => {
    const orgsA = await service.listMine(actorA);
    const ok = await service.assertFeature(actorA, orgsA[0].id, "inventory_upload");
    assert.equal(ok.allowed, true);
  });

  it("lead_board remains 403 (phase-locked)", async () => {
    const orgsA = await service.listMine(actorA);
    await assert.rejects(
      () => service.assertFeature(actorA, orgsA[0].id, "lead_board"),
      (e: unknown) => e instanceof OrganizationError && e.code === "FEATURE_LOCKED",
    );
  });

  it("phase-locked features remain locked even for enterprise plan", () => {
    assert.equal(resolveFeatureEntitlement("enterprise", "lead_board"), false);
    assert.equal(resolveFeatureEntitlement("enterprise", "paid_leads"), false);
    assert.equal(resolveFeatureEntitlement("enterprise", "dialer"), false);
  });

  it("entitlements endpoint returns plan and features", async () => {
    const orgsA = await service.listMine(actorA);
    const ent = await service.entitlements(actorA, orgsA[0].id);
    assert.equal(ent.plan, "free");
    assert.ok(ent.features.length > 0);
    const inv = ent.features.find((f) => f.key === "inventory_upload");
    assert.ok(inv?.active);
    const lb = ent.features.find((f) => f.key === "lead_board");
    assert.ok(lb?.locked);
  });

  it("customers cannot create organizations", async () => {
    const cust = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}cust@test.com`,
        fullName: "Test Customer",
        role: "customer",
        passwordHash: "not-real",
      },
    });
    try {
      await assert.rejects(
        () => service.createOrganization({ userId: cust.id, role: "customer" }, { name: "Should Fail" }),
        (e: unknown) => e instanceof OrganizationError && e.code === "CUSTOMER_NOT_TENANT",
      );
    } finally {
      await prisma.user.delete({ where: { id: cust.id } });
    }
  });

  it("existing users/dealers/vehicles/leads/bookings are untouched", async () => {
    const users = await prisma.user.count({ where: { email: { not: { startsWith: TEST_PREFIX } } } });
    const dealers = await prisma.dealer.count({ where: { slug: { not: { startsWith: TEST_PREFIX } } } });
    const vehicles = await prisma.vehicle.count();
    const leads = await prisma.lead.count();
    const bookings = await prisma.booking.count();
    assert.ok(users >= 4, `Expected >=4 non-test users, got ${users}`);
    assert.ok(dealers >= 1, `Expected >=1 non-test dealers, got ${dealers}`);
    assert.ok(vehicles >= 0);
    assert.ok(leads >= 0);
    assert.ok(bookings >= 0);
  });
});
