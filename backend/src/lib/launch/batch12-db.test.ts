/**
 * DB-backed Batch 12 launch tests. Local Docker PostgreSQL only.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "@/lib/prisma";
import { federatedSearch } from "@/services/unified-search.service";
import { getPlatformAdminOverview } from "@/services/platform-admin.service";
import { getPlatformAnalytics } from "@/services/platform-analytics.service";
import { getQuotation } from "@/services/quotation.service";
import { listSavedSearches, createSavedSearch } from "@/services/saved-search.service";
import { listMySaleRequests } from "@/services/sale-request.service";
import { getMotorCartOne } from "@/services/motorcart-one.service";
import { listUnifiedNotifications } from "@/services/unified-notifications.service";
import { getInventoryByPincode } from "@/services/inventory-by-pincode.service";
import { startConversation, postMessage } from "@/services/ai-agent.service";
import { listJobs, listSellerOrders } from "@/services/partner-industry.service";
import { PartnerOsError } from "@/lib/partneros/errors";
import { rejectClientPaidStatus } from "@/services/commercial-billing.service";
import { GET as healthGet } from "@/app/api/health/route";
import { GET as readyGet } from "@/app/api/ready/route";
import { QuotationError } from "@/lib/quotations/errors";
import { CommercialError } from "@/lib/commercial/errors";

process.env.FEATURE_M5_UNIFIED_SEARCH = "true";
process.env.FEATURE_M4_NOTIFICATIONS = "true";
process.env.FEATURE_PAYMENT_GATEWAY = "false";
delete process.env.OPENAI_API_KEY;

const PREFIX = `__b12_${Date.now()}_`;
const PIN = "110001";
const ids = {
  customerA: "",
  customerB: "",
  dealerOwner: "",
  parts: "",
  dealerId: "",
  orgId: "",
  vehicleId: "",
};

function actor(userId: string, role: string) {
  return { userId, role };
}

async function seed() {
  const customerA = await prisma.user.create({
    data: {
      email: `${PREFIX}a@test.com`,
      fullName: "Cust A",
      role: "customer",
      passwordHash: "x",
      phone: `81${Date.now().toString().slice(-8)}`,
    },
  });
  const customerB = await prisma.user.create({
    data: {
      email: `${PREFIX}b@test.com`,
      fullName: "Cust B",
      role: "customer",
      passwordHash: "x",
      phone: `82${Date.now().toString().slice(-8)}`,
    },
  });
  const dealerOwner = await prisma.user.create({
    data: { email: `${PREFIX}d@test.com`, fullName: "Dealer", role: "dealer", passwordHash: "x" },
  });
  const parts = await prisma.user.create({
    data: { email: `${PREFIX}p@test.com`, fullName: "Parts", role: "parts_seller", passwordHash: "x" },
  });
  const dealer = await prisma.dealer.create({
    data: {
      ownerId: dealerOwner.id,
      name: `${PREFIX} Honda Motors`,
      slug: `${PREFIX}honda`,
      city: "Delhi",
      state: "DL",
      pincode: PIN,
      gstNumber: "07AAAAA0000A1Z5",
      panNumber: "AAAAA0000A",
      email: "secret-dealer@test.com",
      phone: "9999999912",
    },
  });
  const org = await prisma.organization.create({
    data: {
      type: "DEALER",
      name: `${PREFIX} Honda Org`,
      displayName: `${PREFIX} Honda Org`,
      slug: `${PREFIX}honda-org`,
      createdByUserId: dealerOwner.id,
      legacyDealerId: dealer.id,
    },
  });
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: dealerOwner.id, role: "OWNER", status: "active" },
  });
  const vehicle = await prisma.vehicle.create({
    data: {
      dealerId: dealer.id,
      slug: `${PREFIX}city`,
      title: "Honda City available",
      brand: "Honda",
      model: "City",
      year: 2022,
      price: 800_000,
      fuelType: "Petrol",
      transmission: "Manual",
      bodyType: "Sedan",
      category: "used-cars",
      city: "Delhi",
      state: "DL",
      status: "available",
    },
  });
  await prisma.newCarInventory.create({
    data: {
      dealerId: dealer.id,
      brand: "Honda",
      model: "City",
      variant: "VX",
      exShowroomPrice: 1_100_000,
      stockStatus: "available",
      stock: 2,
    },
  });
  await prisma.jobPosting.create({
    data: {
      organizationId: org.id,
      title: "Honda workshop mechanic",
      description: "Service bay",
      status: "OPEN",
    },
  });
  Object.assign(ids, {
    customerA: customerA.id,
    customerB: customerB.id,
    dealerOwner: dealerOwner.id,
    parts: parts.id,
    dealerId: dealer.id,
    orgId: org.id,
    vehicleId: vehicle.id,
  });
}

before(async () => {
  await seed();
});

after(async () => {
  await prisma.aiMessage.deleteMany({ where: { conversation: { userId: { in: [ids.customerA, ids.customerB] } } } }).catch(() => {});
  await prisma.aiUsageRecord.deleteMany({ where: { userId: { in: [ids.customerA, ids.customerB] } } }).catch(() => {});
  await prisma.aiConversation.deleteMany({ where: { userId: { in: [ids.customerA, ids.customerB] } } }).catch(() => {});
  await prisma.notificationLog.deleteMany({ where: { userId: { in: [ids.customerA, ids.customerB] } } }).catch(() => {});
  await prisma.savedSearch.deleteMany({ where: { userId: { in: [ids.customerA, ids.customerB] } } }).catch(() => {});
  await prisma.motorCartOneToken.deleteMany({ where: { identity: { userId: ids.customerA } } }).catch(() => {});
  await prisma.motorCartIdentity.deleteMany({ where: { userId: { in: [ids.customerA, ids.customerB] } } }).catch(() => {});
  await prisma.partProduct.deleteMany({ where: { sellerId: ids.parts } }).catch(() => {});
  await prisma.jobPosting.deleteMany({ where: { organizationId: ids.orgId } }).catch(() => {});
  await prisma.newCarInventory.deleteMany({ where: { dealerId: ids.dealerId } }).catch(() => {});
  await prisma.vehicle.deleteMany({ where: { dealerId: ids.dealerId } }).catch(() => {});
  await prisma.organizationMember.deleteMany({ where: { organizationId: ids.orgId } }).catch(() => {});
  await prisma.organization.deleteMany({ where: { id: ids.orgId } }).catch(() => {});
  await prisma.dealer.deleteMany({ where: { id: ids.dealerId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } }).catch(() => {});
  await prisma.$disconnect();
});

describe("Batch 12 search / admin / isolation", () => {
  it("global search is public-safe and does not dump on short queries", async () => {
    const empty = await federatedSearch({ q: "" });
    assert.equal(empty.total, 0);
    const wild = await federatedSearch({ q: "%" });
    assert.equal(wild.total, 0);
    const honda = await federatedSearch({ q: "honda", type: "vehicles", limit: 80 });
    assert.ok(honda.limit <= 40);
    const blob = JSON.stringify(honda.results);
    assert.equal(blob.includes("secret-dealer@test.com"), false);
    assert.equal(blob.includes("07AAAAA0000A1Z5"), false);
    assert.equal(blob.includes("AAAAA0000A"), false);
    assert.equal(blob.includes("9999999912"), false);
    assert.ok(honda.results.some((r) => r.result_type.includes("car") || r.result_type === "vehicle" || r.result_type === "new_car_stock"));
    const gstQ = await federatedSearch({ q: "07AAAAA0000A1Z5" });
    assert.equal(JSON.stringify(gstQ.results).includes("07AAAAA0000A1Z5"), false);
  });

  it("admin metrics are real counts and never invent MRR", async () => {
    const o = await getPlatformAdminOverview();
    assert.equal(typeof o.totalUsers, "number");
    assert.equal(typeof o.listingsLive, "number");
    assert.equal(o.mrrEstimate, 0);
    assert.ok(o.sources.mrrEstimate.includes("not calculated"));
    const a = await getPlatformAnalytics();
    assert.equal("monthly" in a, false);
    assert.ok(a.leadFunnel.source.includes("leads"));
  });

  it("customer isolation: quotations 404, saved searches, sell list, MotorCart One", async () => {
    await assert.rejects(
      () => getQuotation(actor(ids.customerA, "customer"), "00000000-0000-4000-8000-000000000001"),
      (e: unknown) => e instanceof QuotationError && e.status === 404,
    );
    await createSavedSearch(actor(ids.customerA, "customer"), "Honda hunt", { brand: "Honda" });
    const bSearches = await listSavedSearches(actor(ids.customerB, "customer"));
    assert.equal(bSearches.some((s) => s.name === "Honda hunt"), false);
    const sells = await listMySaleRequests(actor(ids.customerB, "customer"));
    assert.equal(Array.isArray(sells), true);
    const one = await getMotorCartOne(actor(ids.customerA, "customer"));
    assert.equal(one.isPaymentCard, false);
    assert.ok(one.disclaimers.includes("NOT A PAYMENT CARD"));
    assert.equal("phone" in one, false);
    assert.equal("email" in one, false);
    const forged = await getMotorCartOne(actor(ids.customerA, "customer"), ids.customerB);
    assert.equal(forged.publicId, one.publicId);
    assert.equal(forged.fullName, one.fullName);
  });

  it("notification ownership, PIN stock honesty, jobs pagination, seller isolation", async () => {
    await prisma.notificationLog.create({
      data: { userId: ids.customerA, title: `${PREFIX} only A`, body: "private" },
    });
    const aNotes = await listUnifiedNotifications(ids.customerA);
    const bNotes = await listUnifiedNotifications(ids.customerB);
    assert.ok(aNotes.items.some((i) => i.title.includes(`${PREFIX} only A`)));
    assert.equal(bNotes.items.some((i) => i.title.includes(`${PREFIX} only A`)), false);

    const pin = await getInventoryByPincode(PIN);
    assert.ok(pin.count >= 0);
    assert.equal(Array.isArray(pin.items), true);

    const jobs = await listJobs({ q: "Honda", limit: 200 });
    assert.ok(jobs.length <= 50);

    await prisma.partProduct.create({
      data: {
        sellerId: ids.parts,
        name: `${PREFIX} brake pad`,
        categorySlug: "brakes",
        price: 500,
        stock: 3,
        status: "ACTIVE",
      },
    });
    const parts = await federatedSearch({ q: "brake", type: "parts" });
    assert.ok(parts.results.every((r) => r.result_type === "part" || r.result_type === "parts_seller"));
    await assert.rejects(() => listSellerOrders(actor(ids.dealerOwner, "dealer")), PartnerOsError);
  });

  it("payment cannot fake PAID; AI unavailable is honest; health vs ready", async () => {
    await assert.rejects(() => rejectClientPaidStatus("PAID"), (e: CommercialError) => e.code === "FORGED_PAYMENT_STATUS");
    const conv = await startConversation(actor(ids.customerA, "customer"), {});
    const reply = await postMessage(actor(ids.customerA, "customer"), conv.id, "Best Honda in Delhi?");
    assert.equal(reply.aiAvailable, false);
    assert.match(reply.message.content, /AI unavailable/i);

    const health = await healthGet();
    const healthJson = (await health.json()) as { status: string; users?: number };
    assert.equal(healthJson.status, "ok");
    assert.equal("users" in healthJson, false);

    const ready = await readyGet();
    const readyJson = (await ready.json()) as { checks?: { database: boolean; aiKeyConfigured: boolean } };
    assert.equal(ready.status === 200 || ready.status === 503, true);
    if (ready.status === 200) {
      assert.equal(readyJson.checks?.aiKeyConfigured, false);
      assert.equal(typeof readyJson.checks?.database, "boolean");
    }
  });
});
