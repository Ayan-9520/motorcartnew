/**
 * DB-backed Phase 5A quotation isolation tests.
 * Requires local Docker PostgreSQL.
 */
import assert from "node:assert/strict";
import { describe, it, after } from "node:test";
import { prisma } from "@/lib/prisma";
import { QuotationError } from "./errors";
import {
  cancelQuotation,
  createQuotation,
  getQuotation,
  issueQuotation,
  listQuotations,
  updateQuotation,
} from "@/services/quotation.service";

const PREFIX = `__q5a_${Date.now()}_`;

const ids = {
  customerA: "",
  customerB: "",
  ownerA: "",
  ownerB: "",
  dealerA: "",
  dealerB: "",
  orgA: "",
  orgB: "",
  inventoryA: "",
  inventoryB: "",
  quoteA: "",
};

async function seed() {
  const customerA = await prisma.user.create({
    data: {
      email: `${PREFIX}ca@test.com`,
      phone: "9100000001",
      fullName: "Cust A",
      role: "customer",
      passwordHash: "x",
    },
  });
  const customerB = await prisma.user.create({
    data: {
      email: `${PREFIX}cb@test.com`,
      phone: "9100000002",
      fullName: "Cust B",
      role: "customer",
      passwordHash: "x",
    },
  });
  const ownerA = await prisma.user.create({
    data: {
      email: `${PREFIX}da@test.com`,
      fullName: "Dealer A",
      role: "dealer",
      passwordHash: "x",
    },
  });
  const ownerB = await prisma.user.create({
    data: {
      email: `${PREFIX}db@test.com`,
      fullName: "Dealer B",
      role: "dealer",
      passwordHash: "x",
    },
  });
  const dealerA = await prisma.dealer.create({
    data: {
      ownerId: ownerA.id,
      name: `${PREFIX} A Motors`,
      slug: `${PREFIX}a-motors`,
      city: "Pune",
      state: "MH",
      pincode: "411001",
    },
  });
  const dealerB = await prisma.dealer.create({
    data: {
      ownerId: ownerB.id,
      name: `${PREFIX} B Motors`,
      slug: `${PREFIX}b-motors`,
      city: "Mumbai",
      state: "MH",
      pincode: "400001",
    },
  });
  const orgA = await prisma.organization.create({
    data: {
      type: "DEALER",
      name: `${PREFIX} Org A`,
      displayName: `${PREFIX} Org A`,
      slug: `${PREFIX}org-a`,
      createdByUserId: ownerA.id,
      legacyDealerId: dealerA.id,
    },
  });
  const orgB = await prisma.organization.create({
    data: {
      type: "DEALER",
      name: `${PREFIX} Org B`,
      displayName: `${PREFIX} Org B`,
      slug: `${PREFIX}org-b`,
      createdByUserId: ownerB.id,
      legacyDealerId: dealerB.id,
    },
  });
  const inventoryA = await prisma.newCarInventory.create({
    data: {
      dealerId: dealerA.id,
      brand: "Hyundai",
      model: "Creta",
      variant: "SX",
      exShowroomPrice: 1_200_000,
      stockStatus: "available",
    },
  });
  const inventoryB = await prisma.newCarInventory.create({
    data: {
      dealerId: dealerB.id,
      brand: "Tata",
      model: "Nexon",
      variant: "XZ",
      exShowroomPrice: 900_000,
      stockStatus: "available",
    },
  });

  ids.customerA = customerA.id;
  ids.customerB = customerB.id;
  ids.ownerA = ownerA.id;
  ids.ownerB = ownerB.id;
  ids.dealerA = dealerA.id;
  ids.dealerB = dealerB.id;
  ids.orgA = orgA.id;
  ids.orgB = orgB.id;
  ids.inventoryA = inventoryA.id;
  ids.inventoryB = inventoryB.id;
}

async function cleanup() {
  await prisma.quotation.deleteMany({
    where: { dealerId: { in: [ids.dealerA, ids.dealerB].filter(Boolean) } },
  });
  await prisma.newCarInventory.deleteMany({
    where: { id: { in: [ids.inventoryA, ids.inventoryB].filter(Boolean) } },
  });
  await prisma.organization.deleteMany({
    where: { id: { in: [ids.orgA, ids.orgB].filter(Boolean) } },
  });
  await prisma.dealer.deleteMany({
    where: { id: { in: [ids.dealerA, ids.dealerB].filter(Boolean) } },
  });
  await prisma.user.deleteMany({
    where: {
      id: { in: [ids.customerA, ids.customerB, ids.ownerA, ids.ownerB].filter(Boolean) },
    },
  });
}

const dealerA = () => ({ userId: ids.ownerA, role: "dealer" });
const dealerB = () => ({ userId: ids.ownerB, role: "dealer" });
const customerA = () => ({ userId: ids.customerA, role: "customer" });
const customerB = () => ({ userId: ids.customerB, role: "customer" });

describe("Phase 5A quotation isolation", { concurrency: 1 }, () => {
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("seeds tenants", async () => {
    await seed();
    assert.ok(ids.dealerA && ids.dealerB && ids.customerA);
  });

  it("creates a draft and server-calculates total", async () => {
    const created = await createQuotation(dealerA(), {
      customerUserId: ids.customerA,
      inventoryId: ids.inventoryA,
      dealerId: ids.dealerA,
      organizationId: ids.orgA,
      ex_showroom_amount: 1_200_000,
      rto_amount: 80_000,
      insurance_amount: 40_000,
      discount_amount: 20_000,
      total_amount: 1,
      quotation_number: "FAKE",
    });
    ids.quoteA = created.id;
    assert.equal(created.status, "draft");
    assert.equal(created.total_amount, 1_300_000);
    assert.notEqual(created.quotation_number, "FAKE");
    assert.match(created.quotation_number, /^MCQ-/);
    assert.equal(created.organization_id, ids.orgA);
  });

  it("rejects a forged organizationId", async () => {
    await assert.rejects(
      () =>
        createQuotation(dealerA(), {
          customerUserId: ids.customerA,
          dealerId: ids.dealerA,
          organizationId: ids.orgB,
          ex_showroom_amount: 500_000,
        }),
      (e: unknown) => e instanceof QuotationError && e.code === "FORGED_ORGANIZATION_ID",
    );
  });

  it("rejects a forged customerUserId", async () => {
    await assert.rejects(
      () =>
        createQuotation(dealerA(), {
          customerUserId: "not-a-uuid",
          dealerId: ids.dealerA,
          ex_showroom_amount: 500_000,
        }),
      (e: unknown) => e instanceof QuotationError && e.code === "FORGED_CUSTOMER_ID",
    );
  });

  it("customer cannot create a dealer quotation", async () => {
    await assert.rejects(
      () =>
        createQuotation(customerA(), {
          customerUserId: ids.customerA,
          dealerId: ids.dealerA,
          ex_showroom_amount: 500_000,
        }),
      (e: unknown) => e instanceof QuotationError && e.status === 403,
    );
  });

  it("customer cannot modify dealer-owned pricing", async () => {
    await assert.rejects(
      () => updateQuotation(customerA(), ids.quoteA, { ex_showroom_amount: 1 }),
      (e: unknown) => e instanceof QuotationError && e.status === 403,
    );
  });

  it("customer A cannot read customer B quotation", async () => {
    const other = await createQuotation(dealerB(), {
      customerUserId: ids.customerB,
      dealerId: ids.dealerB,
      inventoryId: ids.inventoryB,
      ex_showroom_amount: 900_000,
    });
    await issueQuotation(dealerB(), other.id);
    await assert.rejects(
      () => getQuotation(customerA(), other.id),
      (e: unknown) => e instanceof QuotationError && e.status === 404,
    );
  });

  it("dealer A cannot read dealer B quotation", async () => {
    const listed = await listQuotations(dealerB());
    const bQuote = listed.find((q) => q.dealer_id === ids.dealerB);
    assert.ok(bQuote);
    await assert.rejects(
      () => getQuotation(dealerA(), bQuote!.id),
      (e: unknown) => e instanceof QuotationError && e.status === 404,
    );
  });

  it("issues a quotation and freezes historical pricing", async () => {
    const issued = await issueQuotation(dealerA(), ids.quoteA);
    assert.equal(issued.status, "issued");
    assert.equal(issued.total_amount, 1_300_000);
    assert.ok(issued.validity_end);

    await prisma.newCarInventory.update({
      where: { id: ids.inventoryA },
      data: { exShowroomPrice: 9_999_999 },
    });

    const again = await getQuotation(dealerA(), ids.quoteA);
    assert.equal(again.ex_showroom_amount, 1_200_000);
    assert.equal(again.total_amount, 1_300_000);
    const snap = again.metadata as { pricing?: { totalAmount?: number } };
    assert.equal(snap.pricing?.totalAmount, 1_300_000);
  });

  it("hides drafts from the customer until issued", async () => {
    const draft = await createQuotation(dealerA(), {
      customerUserId: ids.customerA,
      dealerId: ids.dealerA,
      ex_showroom_amount: 400_000,
    });
    const listed = await listQuotations(customerA());
    assert.equal(listed.some((q) => q.id === draft.id), false);
    await assert.rejects(
      () => getQuotation(customerA(), draft.id),
      (e: unknown) => e instanceof QuotationError && e.status === 404,
    );
  });

  it("customer can view an issued quotation", async () => {
    const row = await getQuotation(customerA(), ids.quoteA);
    assert.equal(row.id, ids.quoteA);
    assert.equal(row.status, "issued");
  });

  it("cancels an issued quotation", async () => {
    const cancelled = await cancelQuotation(dealerA(), ids.quoteA);
    assert.equal(cancelled.status, "cancelled");
    const seen = await getQuotation(customerA(), ids.quoteA);
    assert.equal(seen.status, "cancelled");
  });

  it("expires issued quotations past validityEnd", async () => {
    const created = await createQuotation(dealerA(), {
      customerUserId: ids.customerA,
      dealerId: ids.dealerA,
      ex_showroom_amount: 250_000,
    });
    const issued = await issueQuotation(dealerA(), created.id);
    await prisma.quotation.update({
      where: { id: issued.id },
      data: { validityEnd: new Date("2020-01-01T00:00:00Z") },
    });
    const row = await getQuotation(dealerA(), issued.id);
    assert.equal(row.status, "expired");
  });

  it("does not leak cross-tenant rows in list", async () => {
    const a = await listQuotations(dealerA());
    const b = await listQuotations(dealerB());
    assert.equal(a.every((q) => q.dealer_id === ids.dealerA), true);
    assert.equal(b.every((q) => q.dealer_id === ids.dealerB), true);
    const ca = await listQuotations(customerA());
    assert.equal(ca.every((q) => q.customer_user_id === ids.customerA), true);
    assert.equal(ca.some((q) => q.status === "draft"), false);
  });
});
