/**
 * DB-backed Phase 5C exact-PIN stock discovery tests.
 * Requires local Docker PostgreSQL.
 */
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/inventory/by-pincode/route";
import { prisma } from "@/lib/prisma";
import { InventoryError } from "./errors";
import { getInventoryByPincode } from "@/services/inventory-by-pincode.service";

const PREFIX = `__pin5c_${Date.now()}_`;
const PIN_A = "110001";
const PIN_B = "400001";
const PIN_NONE = "160001";
const PIN_NEAR = "110002";

const ids = {
  ownerA: "",
  ownerB: "",
  ownerC: "",
  dealerA: "",
  dealerB: "",
  dealerC: "",
  orgA: "",
  orgB: "",
  orgC: "",
  branchA: "",
  branchA2: "",
  branchC: "",
  invAvailable: "",
  invZero: "",
  invOut: "",
  invBooked: "",
  invTransit: "",
  invUpcoming: "",
  invDelivered: "",
  invUnknown: "",
  invDup: "",
  invBranchOnly: "",
  vehicleAvailable: "",
  vehicleReserved: "",
  vehicleSold: "",
  vehicleDeleted: "",
  catalogVariant: "",
};

async function seed() {
  const ownerA = await prisma.user.create({
    data: { email: `${PREFIX}da@test.com`, fullName: "Dealer A", role: "dealer", passwordHash: "x" },
  });
  const ownerB = await prisma.user.create({
    data: { email: `${PREFIX}db@test.com`, fullName: "Dealer B", role: "dealer", passwordHash: "x" },
  });
  const ownerC = await prisma.user.create({
    data: { email: `${PREFIX}dc@test.com`, fullName: "Dealer C", role: "dealer", passwordHash: "x" },
  });
  ids.ownerA = ownerA.id;
  ids.ownerB = ownerB.id;
  ids.ownerC = ownerC.id;

  const dealerA = await prisma.dealer.create({
    data: {
      ownerId: ownerA.id,
      name: `${PREFIX} A Motors`,
      slug: `${PREFIX}a-motors`,
      city: "Delhi",
      state: "DL",
      pincode: PIN_A,
      gstNumber: "07AAAAA0000A1Z5",
      panNumber: "AAAAA0000A",
      email: "secret-a@test.com",
      phone: "9999999999",
    },
  });
  const dealerB = await prisma.dealer.create({
    data: {
      ownerId: ownerB.id,
      name: `${PREFIX} B Motors`,
      slug: `${PREFIX}b-motors`,
      city: "Mumbai",
      state: "MH",
      pincode: PIN_B,
      gstNumber: "27BBBBB0000B1Z5",
    },
  });
  const dealerC = await prisma.dealer.create({
    data: {
      ownerId: ownerC.id,
      name: `${PREFIX} C Motors`,
      slug: `${PREFIX}c-motors`,
      city: "Delhi",
      state: "DL",
      pincode: null,
    },
  });
  ids.dealerA = dealerA.id;
  ids.dealerB = dealerB.id;
  ids.dealerC = dealerC.id;

  const orgA = await prisma.organization.create({
    data: {
      type: "DEALER",
      name: `${PREFIX} Org A`,
      displayName: `${PREFIX} Org A`,
      slug: `${PREFIX}org-a`,
      createdByUserId: ownerA.id,
      legacyDealerId: dealerA.id,
      typeMetadata: { secret: "org-secret-a" },
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
  const orgC = await prisma.organization.create({
    data: {
      type: "DEALER",
      name: `${PREFIX} Org C`,
      displayName: `${PREFIX} Org C`,
      slug: `${PREFIX}org-c`,
      createdByUserId: ownerC.id,
      legacyDealerId: dealerC.id,
    },
  });
  ids.orgA = orgA.id;
  ids.orgB = orgB.id;
  ids.orgC = orgC.id;

  const branchA = await prisma.organizationBranch.create({
    data: {
      organizationId: orgA.id,
      name: "Connaught Place",
      postalCode: PIN_A,
      country: "IN",
      city: "Delhi",
      latitude: 28.6328,
      longitude: 77.2197,
    },
  });
  const branchA2 = await prisma.organizationBranch.create({
    data: {
      organizationId: orgA.id,
      name: "Karol Bagh",
      postalCode: PIN_A,
      country: "IN",
      city: "Delhi",
    },
  });
  const branchC = await prisma.organizationBranch.create({
    data: {
      organizationId: orgC.id,
      name: "Dwarka Branch",
      postalCode: PIN_NONE,
      country: "IN",
      city: "Delhi",
    },
  });
  ids.branchA = branchA.id;
  ids.branchA2 = branchA2.id;
  ids.branchC = branchC.id;

  const statuses: Array<{ key: keyof typeof ids; status: string; stock: number }> = [
    { key: "invAvailable", status: "available", stock: 2 },
    { key: "invZero", status: "available", stock: 0 },
    { key: "invOut", status: "out_of_stock", stock: 4 },
    { key: "invBooked", status: "booked", stock: 3 },
    { key: "invTransit", status: "transit", stock: 3 },
    { key: "invUpcoming", status: "upcoming", stock: 3 },
    { key: "invDelivered", status: "delivered", stock: 3 },
    { key: "invUnknown", status: "mystery_status", stock: 5 },
    { key: "invDup", status: "available", stock: 1 },
  ];
  for (const row of statuses) {
    const created = await prisma.newCarInventory.create({
      data: {
        dealerId: dealerA.id,
        brand: "Hyundai",
        model: "Creta",
        variant: row.key,
        exShowroomPrice: 1_200_000,
        stockStatus: row.status,
        stock: row.stock,
      },
    });
    ids[row.key] = created.id;
  }

  await prisma.newCarInventory.create({
    data: {
      dealerId: dealerB.id,
      brand: "Tata",
      model: "Nexon",
      variant: "B-only",
      exShowroomPrice: 900_000,
      stockStatus: "available",
      stock: 6,
    },
  });

  const invBranchOnly = await prisma.newCarInventory.create({
    data: {
      dealerId: dealerC.id,
      brand: "Maruti",
      model: "Swift",
      variant: "branch-only",
      exShowroomPrice: 700_000,
      stockStatus: "available",
      stock: 2,
    },
  });
  ids.invBranchOnly = invBranchOnly.id;

  const vehicleAvailable = await prisma.vehicle.create({
    data: {
      dealerId: dealerA.id,
      slug: `${PREFIX}avail`,
      title: "Available Creta",
      brand: "Hyundai",
      model: "Creta",
      year: 2024,
      price: 1_100_000,
      fuelType: "Petrol",
      transmission: "Manual",
      bodyType: "SUV",
      category: "used-cars",
      city: "Delhi",
      state: "DL",
      status: "available",
    },
  });
  const vehicleReserved = await prisma.vehicle.create({
    data: {
      dealerId: dealerA.id,
      slug: `${PREFIX}reserved`,
      title: "Reserved Creta",
      brand: "Hyundai",
      model: "Creta",
      year: 2024,
      price: 1_100_000,
      fuelType: "Petrol",
      transmission: "Manual",
      bodyType: "SUV",
      category: "used-cars",
      city: "Delhi",
      state: "DL",
      status: "reserved",
    },
  });
  const vehicleSold = await prisma.vehicle.create({
    data: {
      dealerId: dealerA.id,
      slug: `${PREFIX}sold`,
      title: "Sold Creta",
      brand: "Hyundai",
      model: "Creta",
      year: 2024,
      price: 1_100_000,
      fuelType: "Petrol",
      transmission: "Manual",
      bodyType: "SUV",
      category: "used-cars",
      city: "Delhi",
      state: "DL",
      status: "sold",
    },
  });
  const vehicleDeleted = await prisma.vehicle.create({
    data: {
      dealerId: dealerA.id,
      slug: `${PREFIX}deleted`,
      title: "Deleted Creta",
      brand: "Hyundai",
      model: "Creta",
      year: 2024,
      price: 1_100_000,
      fuelType: "Petrol",
      transmission: "Manual",
      bodyType: "SUV",
      category: "used-cars",
      city: "Delhi",
      state: "DL",
      status: "available",
      deletedAt: new Date(),
    },
  });
  ids.vehicleAvailable = vehicleAvailable.id;
  ids.vehicleReserved = vehicleReserved.id;
  ids.vehicleSold = vehicleSold.id;
  ids.vehicleDeleted = vehicleDeleted.id;

  const brand = await prisma.catalogBrand.create({
    data: { name: `${PREFIX} Brand`, slug: `${PREFIX}brand`, segment: "car", status: "published" },
  });
  const model = await prisma.catalogModel.create({
    data: {
      brandId: brand.id,
      name: `${PREFIX} Model`,
      slug: `${PREFIX}model`,
      segment: "car",
      bodyType: "SUV",
      status: "published",
    },
  });
  const variant = await prisma.catalogVariant.create({
    data: {
      modelId: model.id,
      name: `${PREFIX} Variant`,
      slug: `${PREFIX}variant`,
      businessKey: `${PREFIX}variant-key`,
      fuelType: "Petrol",
      transmission: "Manual",
      modelYear: 2025,
      status: "published",
      exShowroomRef: 1_000_000,
    },
  });
  ids.catalogVariant = variant.id;
}

async function cleanup() {
  await prisma.vehicle.deleteMany({ where: { slug: { startsWith: PREFIX } } }).catch(() => {});
  await prisma.newCarInventory.deleteMany({ where: { dealerId: { in: [ids.dealerA, ids.dealerB, ids.dealerC].filter(Boolean) } } }).catch(() => {});
  await prisma.organizationBranch.deleteMany({ where: { organizationId: { in: [ids.orgA, ids.orgB, ids.orgC].filter(Boolean) } } }).catch(() => {});
  await prisma.organization.deleteMany({ where: { id: { in: [ids.orgA, ids.orgB, ids.orgC].filter(Boolean) } } }).catch(() => {});
  await prisma.dealer.deleteMany({ where: { id: { in: [ids.dealerA, ids.dealerB, ids.dealerC].filter(Boolean) } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: { in: [ids.ownerA, ids.ownerB, ids.ownerC].filter(Boolean) } } }).catch(() => {});
  await prisma.catalogVariant.deleteMany({ where: { businessKey: `${PREFIX}variant-key` } }).catch(() => {});
  await prisma.catalogModel.deleteMany({ where: { slug: `${PREFIX}model` } }).catch(() => {});
  await prisma.catalogBrand.deleteMany({ where: { slug: `${PREFIX}brand` } }).catch(() => {});
  await prisma.$disconnect();
}

function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

describe("Phase 5C stock-by-PIN — PostgreSQL", async () => {
  await seed();
  after(cleanup);

  it("valid PIN with dealer match returns real available stock", async () => {
    const result = await getInventoryByPincode(PIN_A);
    assert.equal(result.pincode, PIN_A);
    assert.ok(result.count >= 1);
    const inventoryIds = result.items.filter((i) => i.source === "new_car_inventory").map((i) => i.inventoryId);
    assert.ok(inventoryIds.includes(ids.invAvailable));
    assert.ok(inventoryIds.includes(ids.invDup));
  });

  it("valid PIN with no dealer returns []", async () => {
    const result = await getInventoryByPincode("560001");
    assert.deepEqual(result, { pincode: "560001", count: 0, items: [] });
  });

  it("matches dealer pincode exactly", async () => {
    const result = await getInventoryByPincode(PIN_B);
    assert.ok(result.items.every((i) => i.dealerId === ids.dealerB));
    assert.ok(result.items.some((i) => i.source === "new_car_inventory"));
  });

  it("matches branch postalCode through organization.legacyDealerId", async () => {
    const result = await getInventoryByPincode(PIN_NONE);
    assert.ok(result.items.length >= 1);
    assert.ok(result.items.every((i) => i.dealerId === ids.dealerC));
    const branchItem = result.items.find((i) => i.inventoryId === ids.invBranchOnly);
    assert.ok(branchItem);
    assert.equal(branchItem?.branch?.id, ids.branchC);
    assert.equal(branchItem?.branch?.pincode, PIN_NONE);
    assert.equal(branchItem?.branch?.name, "Dwarka Branch");
  });

  it("does not return dealer A stock for an unrelated PIN", async () => {
    const result = await getInventoryByPincode(PIN_B);
    assert.equal(result.items.some((i) => i.dealerId === ids.dealerA), false);
    assert.equal(result.items.some((i) => i.inventoryId === ids.invAvailable), false);
  });

  it("excludes stock = 0 and unavailable / unknown statuses", async () => {
    const result = await getInventoryByPincode(PIN_A);
    const inventoryIds = new Set(result.items.map((i) => i.inventoryId).filter(Boolean));
    assert.equal(inventoryIds.has(ids.invZero), false);
    assert.equal(inventoryIds.has(ids.invOut), false);
    assert.equal(inventoryIds.has(ids.invBooked), false);
    assert.equal(inventoryIds.has(ids.invTransit), false);
    assert.equal(inventoryIds.has(ids.invUpcoming), false);
    assert.equal(inventoryIds.has(ids.invDelivered), false);
    assert.equal(inventoryIds.has(ids.invUnknown), false);
  });

  it("includes available marketplace vehicles and excludes reserved, sold, deleted", async () => {
    const result = await getInventoryByPincode(PIN_A);
    const vehicleIds = new Set(result.items.filter((i) => i.source === "vehicle").map((i) => i.vehicleId));
    assert.equal(vehicleIds.has(ids.vehicleAvailable), true);
    assert.equal(vehicleIds.has(ids.vehicleReserved), false);
    assert.equal(vehicleIds.has(ids.vehicleSold), false);
    assert.equal(vehicleIds.has(ids.vehicleDeleted), false);
  });

  it("never returns a catalog-only row as stock", async () => {
    const result = await getInventoryByPincode(PIN_A);
    assert.equal(result.items.some((i) => i.inventoryId === ids.catalogVariant || i.vehicleId === ids.catalogVariant), false);
    assert.equal(result.items.every((i) => i.source === "new_car_inventory" || i.source === "vehicle"), true);
  });

  it("does not duplicate inventory when dealer PIN and branch PIN both match", async () => {
    const result = await getInventoryByPincode(PIN_A);
    const idsFound = result.items.filter((i) => i.inventoryId === ids.invAvailable);
    assert.equal(idsFound.length, 1);
  });

  it("does not duplicate the same inventory once per matching branch", async () => {
    const result = await getInventoryByPincode(PIN_A);
    const counts = new Map<string, number>();
    for (const item of result.items) {
      const key = `${item.source}:${item.inventoryId ?? item.vehicleId}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const n of counts.values()) assert.equal(n, 1);
    const available = result.items.find((i) => i.inventoryId === ids.invAvailable);
    assert.equal(available?.branch, undefined);
  });

  it("client dealerId cannot expand results", async () => {
    const req = new NextRequest(
      `http://localhost/api/inventory/by-pincode?pincode=${PIN_A}&dealerId=${ids.dealerB}&organizationId=${ids.orgB}&branchId=${ids.branchC}`,
    );
    const res = await GET(req);
    assert.equal(res.status, 200);
    const body = (await json(res)) as { items: Array<{ dealerId: string }> };
    assert.equal(body.items.some((i) => i.dealerId === ids.dealerB), false);
    assert.ok(body.items.every((i) => i.dealerId === ids.dealerA));
  });

  it("response has no customer PII, GST/PAN, or organization secrets", async () => {
    const result = await getInventoryByPincode(PIN_A);
    const blob = JSON.stringify(result);
    assert.equal(blob.includes("07AAAAA0000A1Z5"), false);
    assert.equal(blob.includes("AAAAA0000A"), false);
    assert.equal(blob.includes("secret-a@test.com"), false);
    assert.equal(blob.includes("9999999999"), false);
    assert.equal(blob.includes("org-secret-a"), false);
    assert.equal(blob.includes("passwordHash"), false);
  });

  it("has no radius, distance, nearest, or coordinate behavior", async () => {
    const near = await getInventoryByPincode(PIN_NEAR);
    assert.equal(near.count, 0);
    const exact = await getInventoryByPincode(PIN_A);
    const blob = JSON.stringify(exact);
    assert.equal(blob.includes("distance"), false);
    assert.equal(blob.includes("radius"), false);
    assert.equal(blob.includes("nearest"), false);
    assert.equal(blob.includes("28.6328"), false);
    assert.equal(blob.includes("77.2197"), false);
  });

  it("does not invent mock inventory when nothing matches", async () => {
    const result = await getInventoryByPincode("700001");
    assert.deepEqual(result.items, []);
    assert.equal(result.count, 0);
  });

  it("public GET works without JWT and invalid PIN returns 400", async () => {
    const okReq = new NextRequest(`http://localhost/api/inventory/by-pincode?pincode=${PIN_A}`);
    assert.equal(okReq.headers.get("authorization"), null);
    const okRes = await GET(okReq);
    assert.equal(okRes.status, 200);
    const okBody = await json(okRes);
    assert.equal(okBody.pincode, PIN_A);

    const badRes = await GET(new NextRequest("http://localhost/api/inventory/by-pincode?pincode=000000"));
    assert.equal(badRes.status, 400);
    const badBody = await json(badRes);
    assert.equal(badBody.message, "Invalid pincode");
  });

  it("rejects invalid PIN before lookup", async () => {
    await assert.rejects(
      () => getInventoryByPincode("abcdef"),
      (e: unknown) => e instanceof InventoryError && e.status === 400,
    );
  });
});
