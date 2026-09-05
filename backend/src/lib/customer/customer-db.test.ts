/**
 * DB-backed Phase 4 customer 360 isolation tests.
 * Requires local Docker PostgreSQL.
 */
import assert from "node:assert/strict";
import { describe, it, after } from "node:test";
import { prisma } from "@/lib/prisma";
import { CustomerError } from "./errors";
import {
  createCustomerVehicle,
  getCustomer360,
  markCustomerNotificationRead,
  updateCustomerVehicle,
  upsertCustomerPreferences,
} from "@/services/customer-360.service";
import { createCustomerEnquiry } from "@/lib/leads/enquiry.service";

const PREFIX = `__c360_${Date.now()}_`;
const ids = {
  a: "",
  b: "",
  dealer: "",
  dealerOwner: "",
  vehicleA: "",
  vehicleB: "",
};

async function seed() {
  const a = await prisma.user.create({
    data: {
      email: `${PREFIX}a@test.com`,
      phone: "9000000001",
      fullName: "Cust A",
      role: "customer",
      passwordHash: "x",
    },
  });
  const b = await prisma.user.create({
    data: {
      email: `${PREFIX}b@test.com`,
      phone: "9000000002",
      fullName: "Cust B",
      role: "customer",
      passwordHash: "x",
    },
  });
  const owner = await prisma.user.create({
    data: {
      email: `${PREFIX}dealer@test.com`,
      fullName: "Dealer",
      role: "dealer",
      passwordHash: "x",
    },
  });
  const dealer = await prisma.dealer.create({
    data: {
      ownerId: owner.id,
      name: `${PREFIX} Motors`,
      slug: `${PREFIX}motors`,
      city: "Pune",
      state: "MH",
    },
  });
  const listingA = await prisma.vehicle.create({
    data: {
      sellerId: owner.id,
      dealerId: dealer.id,
      title: `${PREFIX} A listing`,
      slug: `${PREFIX}a-listing`,
      brand: "Hyundai",
      model: "Creta",
      year: 2022,
      price: 1_200_000,
      fuelType: "petrol",
      transmission: "manual",
      bodyType: "SUV",
      category: "car",
      city: "Pune",
      state: "MH",
    },
  });
  const listingB = await prisma.vehicle.create({
    data: {
      sellerId: owner.id,
      dealerId: dealer.id,
      title: `${PREFIX} B listing`,
      slug: `${PREFIX}b-listing`,
      brand: "Tata",
      model: "Nexon",
      year: 2021,
      price: 900_000,
      fuelType: "petrol",
      transmission: "manual",
      bodyType: "SUV",
      category: "car",
      city: "Pune",
      state: "MH",
    },
  });
  ids.a = a.id;
  ids.b = b.id;
  ids.dealer = dealer.id;
  ids.dealerOwner = owner.id;
  ids.vehicleA = listingA.id;
  ids.vehicleB = listingB.id;
}

async function cleanup() {
  await prisma.wishlist.deleteMany({ where: { userId: { in: [ids.a, ids.b].filter(Boolean) } } });
  await prisma.notification.deleteMany({
    where: { userId: { in: [ids.a, ids.b, ids.dealerOwner].filter(Boolean) } },
  });
  await prisma.customerVehicle.deleteMany({ where: { userId: { in: [ids.a, ids.b].filter(Boolean) } } });
  await prisma.customerPreference.deleteMany({ where: { userId: { in: [ids.a, ids.b].filter(Boolean) } } });
  if (ids.dealer) {
    await prisma.dealerLead.deleteMany({ where: { dealerId: ids.dealer } });
    await prisma.lead.deleteMany({ where: { dealerId: ids.dealer } });
  }
  await prisma.vehicle.deleteMany({ where: { id: { in: [ids.vehicleA, ids.vehicleB].filter(Boolean) } } });
  if (ids.dealer) await prisma.dealer.deleteMany({ where: { id: ids.dealer } });
  await prisma.user.deleteMany({
    where: { id: { in: [ids.a, ids.b, ids.dealerOwner].filter(Boolean) } },
  });
}

describe("Phase 4 customer 360 isolation", { concurrency: 1 }, () => {
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("seeds users", async () => {
    await seed();
    assert.ok(ids.a && ids.b);
  });

  it("garage vehicles are owner-scoped", async () => {
    const va = await createCustomerVehicle({ userId: ids.a, role: "customer" }, {
      brand: "Hyundai",
      model: "Venue",
      year: 2020,
      registrationNumber: "MH12AA0001",
    });
    await createCustomerVehicle({ userId: ids.b, role: "customer" }, {
      brand: "Honda",
      model: "City",
      year: 2019,
    });
    const snapA = await getCustomer360({ userId: ids.a, role: "customer" });
    const snapB = await getCustomer360({ userId: ids.b, role: "customer" });
    assert.equal(snapA.vehicles.length, 1);
    assert.equal(snapA.vehicles[0]?.brand, "Hyundai");
    assert.equal(snapB.vehicles.length, 1);
    assert.equal(snapB.vehicles[0]?.brand, "Honda");
    assert.equal(snapA.vehicles[0]?.id, va.id);
  });

  it("does not invent garage history", async () => {
    const snap = await getCustomer360({ userId: ids.a, role: "customer" });
    assert.equal(snap.insurance.length, 0);
    assert.equal(snap.service_records.length, 0);
    assert.equal(snap.insights.length, 0);
    assert.equal(snap.campaigns.length, 0);
    assert.equal(snap.availability.rewards_ledger, false);
  });

  it("rejects updating another customer's vehicle", async () => {
    const snapB = await getCustomer360({ userId: ids.b, role: "customer" });
    const otherId = snapB.vehicles[0]!.id;
    await assert.rejects(
      () => updateCustomerVehicle({ userId: ids.a, role: "customer" }, otherId, { isPrimary: true }),
      (e: unknown) => e instanceof CustomerError && e.status === 404,
    );
  });

  it("wishlist rows are isolated", async () => {
    await prisma.wishlist.create({ data: { userId: ids.a, vehicleId: ids.vehicleA } });
    await prisma.wishlist.create({ data: { userId: ids.b, vehicleId: ids.vehicleB } });
    const snapA = await getCustomer360({ userId: ids.a, role: "customer" });
    const snapB = await getCustomer360({ userId: ids.b, role: "customer" });
    assert.deepEqual(snapA.wishlist.vehicle_ids, [ids.vehicleA]);
    assert.deepEqual(snapB.wishlist.vehicle_ids, [ids.vehicleB]);
  });

  it("enquiries belong to the authenticated customer", async () => {
    await createCustomerEnquiry(
      {
        name: "Cust A",
        phone: "9000000001",
        dealer_id: ids.dealer,
        vehicle_title: "Hyundai Creta",
        consent: true,
      },
      { actorUserId: ids.a },
    );
    await createCustomerEnquiry(
      {
        name: "Cust B",
        phone: "9000000002",
        dealer_id: ids.dealer,
        vehicle_title: "Tata Nexon",
        consent: true,
      },
      { actorUserId: ids.b },
    );
    const snapA = await getCustomer360({ userId: ids.a, role: "customer" });
    const snapB = await getCustomer360({ userId: ids.b, role: "customer" });
    assert.equal(snapA.enquiries.length, 1);
    assert.equal(snapA.enquiries[0]?.vehicle_interest, "Hyundai Creta");
    assert.equal(snapB.enquiries.length, 1);
    assert.equal(snapB.enquiries[0]?.vehicle_interest, "Tata Nexon");
  });

  it("ignores client-supplied customer_user_id", async () => {
    await createCustomerEnquiry(
      {
        name: "Spoof",
        phone: "9000000003",
        dealer_id: ids.dealer,
        vehicle_title: "Spoof car",
        consent: true,
        metadata: { customer_user_id: ids.a },
      },
      { actorUserId: ids.b },
    );
    const snapA = await getCustomer360({ userId: ids.a, role: "customer" });
    assert.equal(snapA.enquiries.some((e) => e.vehicle_interest === "Spoof car"), false);
  });

  it("notification mark-read is owner scoped", async () => {
    const note = await prisma.notification.create({
      data: { userId: ids.a, title: "Hello", body: "Test", kind: "system" },
    });
    await assert.rejects(
      () => markCustomerNotificationRead({ userId: ids.b, role: "customer" }, note.id),
      (e: unknown) => e instanceof CustomerError && e.status === 404,
    );
    const marked = await markCustomerNotificationRead({ userId: ids.a, role: "customer" }, note.id);
    assert.equal(marked.read, true);
    const snap = await getCustomer360({ userId: ids.a, role: "customer" });
    assert.equal(snap.notifications.find((n) => n.id === note.id)?.read, true);
  });

  it("preferences persist without inventing loyalty points", async () => {
    const prefs = await upsertCustomerPreferences({ userId: ids.a, role: "customer" }, {
      dob: "1990-01-01",
      city: "Pune",
    });
    assert.equal(prefs.dob, "1990-01-01");
    assert.equal(prefs.city, "Pune");
    assert.equal(prefs.reward_points_balance, 0);
  });
});
