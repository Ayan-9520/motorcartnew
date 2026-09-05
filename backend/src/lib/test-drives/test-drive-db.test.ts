/**
 * DB-backed Phase 5B test-drive isolation and lifecycle tests.
 * Requires local Docker PostgreSQL.
 */
import assert from "node:assert/strict";
import { describe, it, after } from "node:test";
import { prisma } from "@/lib/prisma";
import { TestDriveError } from "./errors";
import { createQuotation } from "@/services/quotation.service";
import {
  cancelTestDrive,
  completeTestDrive,
  confirmTestDrive,
  createTestDrive,
  getTestDrive,
  listTestDrives,
  markNoShow,
  rejectTestDrive,
  rescheduleTestDrive,
} from "@/services/test-drive.service";

const PREFIX = `__td5b_${Date.now()}_`;

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
  vehicleA: "",
  leadA: "",
  quoteA: "",
  bookingA: "",
};

function futureIso(hours = 48) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

async function seed() {
  const customerA = await prisma.user.create({
    data: {
      email: `${PREFIX}ca@test.com`,
      phone: "9100000101",
      fullName: "Cust A",
      role: "customer",
      passwordHash: "x",
    },
  });
  const customerB = await prisma.user.create({
    data: {
      email: `${PREFIX}cb@test.com`,
      phone: "9100000102",
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
  const vehicleA = await prisma.vehicle.create({
    data: {
      dealerId: dealerA.id,
      slug: `${PREFIX}creta`,
      title: "Hyundai Creta SX",
      brand: "Hyundai",
      model: "Creta",
      year: 2025,
      price: 1_200_000,
      fuelType: "Petrol",
      transmission: "Automatic",
      bodyType: "SUV",
      category: "new-cars",
      city: "Pune",
      state: "MH",
    },
  });
  const leadA = await prisma.lead.create({
    data: {
      dealerId: dealerA.id,
      name: "Cust A",
      phone: "9100000101",
      source: "website",
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
  ids.vehicleA = vehicleA.id;
  ids.leadA = leadA.id;
}

async function cleanup() {
  const userIds = [ids.customerA, ids.customerB, ids.ownerA, ids.ownerB].filter(Boolean);
  const dealerIds = [ids.dealerA, ids.dealerB].filter(Boolean);
  await prisma.testDriveBooking.deleteMany({ where: { dealerId: { in: dealerIds } } });
  await prisma.quotation.deleteMany({ where: { dealerId: { in: dealerIds } } });
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.lead.deleteMany({ where: { id: ids.leadA || undefined } });
  await prisma.vehicle.deleteMany({ where: { id: ids.vehicleA || undefined } });
  await prisma.newCarInventory.deleteMany({
    where: { id: { in: [ids.inventoryA, ids.inventoryB].filter(Boolean) } },
  });
  await prisma.organization.deleteMany({
    where: { id: { in: [ids.orgA, ids.orgB].filter(Boolean) } },
  });
  await prisma.dealer.deleteMany({ where: { id: { in: dealerIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

const dealerA = () => ({ userId: ids.ownerA, role: "dealer" });
const dealerB = () => ({ userId: ids.ownerB, role: "dealer" });
const customerA = () => ({ userId: ids.customerA, role: "customer" });
const customerB = () => ({ userId: ids.customerB, role: "customer" });

describe("Phase 5B test-drive isolation", { concurrency: 1 }, () => {
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("seeds tenants", async () => {
    await seed();
    assert.ok(ids.dealerA && ids.dealerB && ids.customerA);
  });

  it("empty state remains truthful — no mock bookings", async () => {
    const listed = await listTestDrives(customerA());
    assert.equal(listed.length, 0);
    const dealerListed = await listTestDrives(dealerA());
    assert.equal(dealerListed.length, 0);
  });

  it("customer creates a request as REQUESTED, not confirmed", async () => {
    const created = await createTestDrive(customerA(), {
      inventoryId: ids.inventoryA,
      dealerId: ids.dealerA,
      organizationId: ids.orgA,
      requested_start_at: futureIso(48),
      customer_notes: "Prefer morning",
    });
    ids.bookingA = created.id;
    assert.equal(created.status, "requested");
    assert.equal(created.customer_user_id, ids.customerA);
    assert.equal(created.dealer_id, ids.dealerA);
    assert.equal(created.organization_id, ids.orgA);
    assert.equal(created.confirmed_start_at, null);
    assert.ok(created.requested_start_at);
  });

  it("dealer receives the request", async () => {
    const listed = await listTestDrives(dealerA());
    assert.equal(listed.some((row) => row.id === ids.bookingA), true);
  });

  it("customer isolation — B cannot read A", async () => {
    await assert.rejects(
      () => getTestDrive(customerB(), ids.bookingA),
      (e: unknown) => e instanceof TestDriveError && e.status === 404,
    );
  });

  it("dealer isolation — B cannot read A", async () => {
    await assert.rejects(
      () => getTestDrive(dealerB(), ids.bookingA),
      (e: unknown) => e instanceof TestDriveError && e.status === 404,
    );
  });

  it("organization isolation — lists do not leak across tenants", async () => {
    const a = await listTestDrives(dealerA());
    const b = await listTestDrives(dealerB());
    assert.equal(a.every((row) => row.dealer_id === ids.dealerA), true);
    assert.equal(b.every((row) => row.dealer_id === ids.dealerB), true);
    assert.equal(a.every((row) => row.organization_id !== ids.orgB), true);
  });

  it("rejects a forged customer ID", async () => {
    await assert.rejects(
      () =>
        createTestDrive(customerA(), {
          inventoryId: ids.inventoryA,
          customerUserId: ids.customerB,
          requested_start_at: futureIso(50),
        }),
      (e: unknown) => e instanceof TestDriveError && e.code === "FORGED_CUSTOMER_ID",
    );
    await assert.rejects(
      () =>
        createTestDrive(customerA(), {
          inventoryId: ids.inventoryA,
          customerUserId: "not-a-uuid",
          requested_start_at: futureIso(50),
        }),
      (e: unknown) => e instanceof TestDriveError && e.code === "FORGED_CUSTOMER_ID",
    );
  });

  it("rejects a forged dealer ID", async () => {
    await assert.rejects(
      () =>
        createTestDrive(customerA(), {
          inventoryId: ids.inventoryA,
          dealerId: ids.dealerB,
          requested_start_at: futureIso(52),
        }),
      (e: unknown) => e instanceof TestDriveError && e.code === "FORGED_DEALER_ID",
    );
  });

  it("rejects a forged organization ID", async () => {
    await assert.rejects(
      () =>
        createTestDrive(customerA(), {
          inventoryId: ids.inventoryA,
          organizationId: ids.orgB,
          requested_start_at: futureIso(54),
        }),
      (e: unknown) => e instanceof TestDriveError && e.code === "FORGED_ORGANIZATION_ID",
    );
  });

  it("rejects inventory that does not match the vehicle dealer", async () => {
    await assert.rejects(
      () =>
        createTestDrive(customerA(), {
          vehicleId: ids.vehicleA,
          inventoryId: ids.inventoryB,
          requested_start_at: futureIso(56),
        }),
      (e: unknown) => e instanceof TestDriveError && e.code === "INVENTORY_FORBIDDEN",
    );
  });

  it("validates requested time", async () => {
    await assert.rejects(
      () =>
        createTestDrive(customerA(), {
          inventoryId: ids.inventoryA,
          requested_start_at: new Date(Date.now() - 3600_000).toISOString(),
        }),
      (e: unknown) => e instanceof TestDriveError && e.code === "TIME_IN_PAST",
    );
    const start = futureIso(60);
    const end = new Date(Date.now() + 59 * 60 * 60 * 1000).toISOString();
    await assert.rejects(
      () =>
        createTestDrive(customerA(), {
          inventoryId: ids.inventoryA,
          requested_start_at: start,
          requested_end_at: end,
        }),
      (e: unknown) => e instanceof TestDriveError && e.code === "INVALID_TIME_RANGE",
    );
  });

  it("customer cannot confirm their own request", async () => {
    await assert.rejects(
      () => confirmTestDrive(customerA(), ids.bookingA),
      (e: unknown) => e instanceof TestDriveError && e.status === 403,
    );
  });

  it("dealer cannot access another dealer's request", async () => {
    await assert.rejects(
      () => confirmTestDrive(dealerB(), ids.bookingA),
      (e: unknown) => e instanceof TestDriveError && e.status === 404,
    );
  });

  it("confirm lifecycle", async () => {
    const confirmed = await confirmTestDrive(dealerA(), ids.bookingA);
    assert.equal(confirmed.status, "confirmed");
    assert.ok(confirmed.confirmed_start_at);
  });

  it("reschedule lifecycle", async () => {
    const nextStart = futureIso(72);
    const nextEnd = new Date(Date.now() + 73 * 60 * 60 * 1000).toISOString();
    const row = await rescheduleTestDrive(dealerA(), ids.bookingA, {
      confirmed_start_at: nextStart,
      confirmed_end_at: nextEnd,
    });
    assert.equal(row.status, "rescheduled");
    const confirmed = await confirmTestDrive(dealerA(), ids.bookingA, {
      confirmed_start_at: nextStart,
      confirmed_end_at: nextEnd,
    });
    assert.equal(confirmed.status, "confirmed");
  });

  it("complete lifecycle", async () => {
    const row = await completeTestDrive(dealerA(), ids.bookingA);
    assert.equal(row.status, "completed");
    assert.ok(row.completed_at);
  });

  it("invalid status transition after complete", async () => {
    await assert.rejects(
      () => confirmTestDrive(dealerA(), ids.bookingA),
      (e: unknown) => e instanceof TestDriveError && e.code === "INVALID_TRANSITION",
    );
    await assert.rejects(
      () => cancelTestDrive(customerA(), ids.bookingA),
      (e: unknown) => e instanceof TestDriveError && e.code === "INVALID_TRANSITION",
    );
  });

  it("reject lifecycle", async () => {
    const created = await createTestDrive(customerA(), {
      inventoryId: ids.inventoryA,
      requested_start_at: futureIso(80),
    });
    const rejected = await rejectTestDrive(dealerA(), created.id, { rejection_reason: "Slot full" });
    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.rejection_reason, "Slot full");
    await assert.rejects(
      () => confirmTestDrive(dealerA(), created.id),
      (e: unknown) => e instanceof TestDriveError && e.code === "INVALID_TRANSITION",
    );
  });

  it("cancel lifecycle", async () => {
    const created = await createTestDrive(customerA(), {
      inventoryId: ids.inventoryA,
      requested_start_at: futureIso(84),
    });
    const cancelled = await cancelTestDrive(customerA(), created.id, { cancellation_reason: "Plans changed" });
    assert.equal(cancelled.status, "cancelled");
  });

  it("no-show lifecycle", async () => {
    const created = await createTestDrive(customerA(), {
      inventoryId: ids.inventoryA,
      requested_start_at: futureIso(88),
    });
    await confirmTestDrive(dealerA(), created.id);
    const noshow = await markNoShow(dealerA(), created.id);
    assert.equal(noshow.status, "no_show");
  });

  it("creates in-app notifications", async () => {
    const created = await createTestDrive(customerA(), {
      vehicleId: ids.vehicleA,
      requested_start_at: futureIso(96),
    });
    const customerNotes = await prisma.notification.findMany({
      where: { userId: ids.customerA, kind: "test_drive" },
    });
    const dealerNotes = await prisma.notification.findMany({
      where: { userId: ids.ownerA, kind: "test_drive" },
    });
    assert.ok(customerNotes.some((n) => String((n.payload as { testDriveId?: string }).testDriveId) === created.id));
    assert.ok(dealerNotes.some((n) => String((n.payload as { testDriveId?: string }).testDriveId) === created.id));
  });

  it("stores optional quotation and lead relations", async () => {
    const quote = await createQuotation(dealerA(), {
      customerUserId: ids.customerA,
      dealerId: ids.dealerA,
      inventoryId: ids.inventoryA,
      ex_showroom_amount: 1_200_000,
    });
    ids.quoteA = quote.id;
    const created = await createTestDrive(customerA(), {
      inventoryId: ids.inventoryA,
      quotationId: quote.id,
      leadId: ids.leadA,
      requested_start_at: futureIso(100),
    });
    assert.equal(created.quotation_id, quote.id);
    assert.equal(created.lead_id, ids.leadA);
    const without = await createTestDrive(customerA(), {
      inventoryId: ids.inventoryA,
      requested_start_at: futureIso(108),
    });
    assert.equal(without.quotation_id, null);
    assert.equal(without.lead_id, null);
  });
});
