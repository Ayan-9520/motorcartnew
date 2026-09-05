/**
 * DB-backed Batch 9 customer super-app tests. Local Docker PostgreSQL only.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { prisma } from "@/lib/prisma";
import { SuperAppError } from "./errors";
import { SalesOsError } from "@/lib/sales-os/errors";
import { looksLikePublicId } from "./public-id";
import { slidingWindowReset } from "@/lib/http/sliding-window";
import { ensureIdentity, getMotorCartOne, issueQrToken, revokeQrTokens, verifyQrToken } from "@/services/motorcart-one.service";
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  runSavedSearch,
  runSavedSearchNotifications,
  updateSavedSearch,
} from "@/services/saved-search.service";
import {
  completeReminder,
  createCustomReminder,
  dismissReminder,
  listReminders,
  notifyDueReminders,
  snoozeReminder,
  syncSystemReminders,
} from "@/services/reminder.service";
import { assertNotDocumentMime, processMediaAsset, registerMediaAsset, reviewMediaAuthenticity } from "@/services/vehicle-media.service";
import {
  acceptOffer,
  cancelSaleRequest,
  createSaleRequest,
  expireStaleOffers,
  listMySaleRequests,
  listOpenSaleRequests,
  listValuationQueue,
  maskSaleRequest,
  submitPurchaseOffer,
  submitSaleRequest,
  submitValuation,
  withdrawOffer,
} from "@/services/sale-request.service";
import { getCustomer360, getCustomerActivity } from "@/services/customer-360.service";

process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), "mc-b9-"));

const PREFIX = `__b9_${Date.now()}_`;
const ids = {
  customer: "",
  customerB: "",
  admin: "",
  ownerA: "",
  ownerB: "",
  dealerA: "",
  dealerB: "",
  orgA: "",
  orgB: "",
  valUser: "",
  valUserB: "",
  valOrg: "",
  valOrgB: "",
  vehicle: "",
  sale: "",
  offer: "",
  offer2: "",
  search: "",
};

const admin = () => ({ userId: ids.admin, role: "super_admin" });
const dealerA = () => ({ userId: ids.ownerA, role: "dealer" });
const dealerB = () => ({ userId: ids.ownerB, role: "dealer" });
const customer = () => ({ userId: ids.customer, role: "customer" });
const customerB = () => ({ userId: ids.customerB, role: "customer" });
const valA = () => ({ userId: ids.valUser, role: "dealer" });
const valB = () => ({ userId: ids.valUserB, role: "dealer" });

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xfe, 0x00, 0x02, 0xff, 0xd9]);

async function seed() {
  const customerU = await prisma.user.create({
    data: {
      email: `${PREFIX}c@test.com`,
      phone: `91${PREFIX.replace(/\D/g, "").slice(-8)}`,
      fullName: "Cust Nine",
      role: "customer",
      passwordHash: "x",
    },
  });
  const customer2 = await prisma.user.create({
    data: {
      email: `${PREFIX}c2@test.com`,
      phone: `92${PREFIX.replace(/\D/g, "").slice(-8)}`,
      fullName: "Cust Nine B",
      role: "customer",
      passwordHash: "x",
    },
  });
  const adminU = await prisma.user.create({
    data: { email: `${PREFIX}admin@test.com`, fullName: "Admin", role: "super_admin", passwordHash: "x" },
  });
  const ownerA = await prisma.user.create({
    data: { email: `${PREFIX}da@test.com`, fullName: "Dealer A", role: "dealer", passwordHash: "x" },
  });
  const ownerB = await prisma.user.create({
    data: { email: `${PREFIX}db@test.com`, fullName: "Dealer B", role: "dealer", passwordHash: "x" },
  });
  const valUser = await prisma.user.create({
    data: { email: `${PREFIX}va@test.com`, fullName: "Valuer A", role: "dealer", passwordHash: "x" },
  });
  const valUserB = await prisma.user.create({
    data: { email: `${PREFIX}vb@test.com`, fullName: "Valuer B", role: "dealer", passwordHash: "x" },
  });
  const dA = await prisma.dealer.create({
    data: { ownerId: ownerA.id, name: `${PREFIX} A`, slug: `${PREFIX}a`, city: "Pune", state: "MH", pincode: "411001" },
  });
  const dB = await prisma.dealer.create({
    data: { ownerId: ownerB.id, name: `${PREFIX} B`, slug: `${PREFIX}b`, city: "Mumbai", state: "MH", pincode: "400001" },
  });
  const orgA = await prisma.organization.create({
    data: {
      type: "DEALER",
      name: `${PREFIX} Org A`,
      displayName: `${PREFIX} Org A`,
      slug: `${PREFIX}org-a`,
      createdByUserId: ownerA.id,
      legacyDealerId: dA.id,
    },
  });
  const orgB = await prisma.organization.create({
    data: {
      type: "DEALER",
      name: `${PREFIX} Org B`,
      displayName: `${PREFIX} Org B`,
      slug: `${PREFIX}org-b`,
      createdByUserId: ownerB.id,
      legacyDealerId: dB.id,
    },
  });
  const valOrg = await prisma.organization.create({
    data: {
      type: "VALUATION_PARTNER",
      name: `${PREFIX} Val A`,
      displayName: `${PREFIX} Val A`,
      slug: `${PREFIX}val-a`,
      createdByUserId: valUser.id,
    },
  });
  const valOrgB = await prisma.organization.create({
    data: {
      type: "VALUATION_PARTNER",
      name: `${PREFIX} Val B`,
      displayName: `${PREFIX} Val B`,
      slug: `${PREFIX}val-b`,
      createdByUserId: valUserB.id,
    },
  });
  await prisma.organizationMember.createMany({
    data: [
      { organizationId: orgA.id, userId: ownerA.id, role: "OWNER", status: "active" },
      { organizationId: orgB.id, userId: ownerB.id, role: "OWNER", status: "active" },
      { organizationId: valOrg.id, userId: valUser.id, role: "OWNER", status: "active" },
      { organizationId: valOrgB.id, userId: valUserB.id, role: "OWNER", status: "active" },
    ],
  });
  const vehicle = await prisma.vehicle.create({
    data: {
      dealerId: dA.id,
      slug: `${PREFIX}creta`,
      title: "Hyundai Creta SX",
      brand: "Hyundai",
      model: "Creta",
      year: 2022,
      price: 900_000,
      fuelType: "Petrol",
      transmission: "Manual",
      bodyType: "SUV",
      category: "car",
      city: "Pune",
      state: "MH",
    },
  });
  await prisma.rewardAccount.create({ data: { userId: customerU.id, balance: 42 } });
  ids.customer = customerU.id;
  ids.customerB = customer2.id;
  ids.admin = adminU.id;
  ids.ownerA = ownerA.id;
  ids.ownerB = ownerB.id;
  ids.dealerA = dA.id;
  ids.dealerB = dB.id;
  ids.orgA = orgA.id;
  ids.orgB = orgB.id;
  ids.valUser = valUser.id;
  ids.valUserB = valUserB.id;
  ids.valOrg = valOrg.id;
  ids.valOrgB = valOrgB.id;
  ids.vehicle = vehicle.id;
}

describe("Batch 9 super-app db", () => {
  after(async () => {
    await prisma.$disconnect();
  });

  it("seeds fixtures", async () => {
    await seed();
    assert.ok(ids.customer);
  });

  it("issues a stable MotorCart Customer ID without PII", async () => {
    const a = await ensureIdentity(ids.customer);
    const b = await ensureIdentity(ids.customer);
    assert.equal(a.publicId, b.publicId);
    assert.equal(looksLikePublicId(a.publicId), true);
    assert.equal(a.publicId.toLowerCase().includes("cust"), false);
    const card = await getMotorCartOne(customer());
    assert.equal(card.isPaymentCard, false);
    assert.equal(card.rewardBalance, 42);
    assert.equal(card.publicId, a.publicId);
    await assert.rejects(() => getMotorCartOne(dealerA()), (e: SuperAppError) => e.code === "FORBIDDEN");
  });

  it("QR token is rotatable, not JWT, and public verify is minimal", async () => {
    slidingWindowReset();
    const issued = await issueQrToken(customer());
    assert.equal(issued.token.includes("."), false);
    const first = await verifyQrToken(issued.token, "10.0.0.1");
    assert.equal(first.title, "MotorCart One Member");
    assert.ok(first.publicId);
    const blob = JSON.stringify(first);
    assert.equal(blob.includes("9111111111"), false);
    assert.equal(blob.includes(`${PREFIX}c@test.com`), false);
    assert.equal(blob.includes(ids.customer), false);
    assert.equal("fullName" in first, false);
    await issueQrToken(customer());
    await assert.rejects(() => verifyQrToken(issued.token, "10.0.0.1"), (e: SuperAppError) => e.code === "TOKEN_REVOKED");
    const fresh = await issueQrToken(customer());
    await revokeQrTokens(customer());
    await assert.rejects(() => verifyQrToken(fresh.token, "10.0.0.1"), (e: SuperAppError) => e.code === "TOKEN_REVOKED");
    await assert.rejects(() => verifyQrToken("short", "10.0.0.1"), (e: SuperAppError) => e.code === "INVALID_TOKEN");
  });

  it("rate-limits public QR verification", async () => {
    slidingWindowReset("mc1:rate-test");
    const tok = await issueQrToken(customer());
    let limited = false;
    for (let i = 0; i < 45; i++) {
      try {
        await verifyQrToken(tok.token, "rate-test");
      } catch (e) {
        if (e instanceof SuperAppError && e.code === "RATE_LIMIT") limited = true;
      }
    }
    assert.equal(limited, true);
  });

  it("saved searches CRUD, isolation, PIN filter, real matches only", async () => {
    const s = await createSavedSearch(customer(), "Pune Creta", { brand: "Hyundai", pincode: "411001" }, true);
    ids.search = s.id;
    await assert.rejects(
      () => updateSavedSearch(customerB(), s.id, { name: "stolen" }),
      (e: SuperAppError) => e.code === "NOT_FOUND",
    );
    const run = await runSavedSearch(customer(), s.id);
    assert.ok(run.count >= 1);
    assert.ok(run.vehicles.some((v) => v.id === ids.vehicle));
    const none = await createSavedSearch(customer(), "No PIN", { brand: "Hyundai", pincode: "999999" }, false);
    const miss = await runSavedSearch(customer(), none.id);
    assert.equal(miss.count, 0);
    const firstNotify = await runSavedSearchNotifications();
    assert.ok(firstNotify.notified >= 1);
    const second = await runSavedSearchNotifications();
    assert.equal(second.notified, 0);
    await deleteSavedSearch(customer(), none.id);
    const listed = await listSavedSearches(customerB());
    assert.equal(listed.some((x) => x.id === s.id), false);
  });

  it("reminders: system from real insurance, custom, snooze, isolation, notify dedupe", async () => {
    const none = await syncSystemReminders(ids.customer);
    assert.equal(none.length, 0);
    const wallet = await prisma.insuranceWallet.create({
      data: {
        userId: ids.customer,
        insurerName: "Test Insurer",
        policyEnd: new Date(Date.now() + 86400000 * 20),
      },
    });
    const created = await syncSystemReminders(ids.customer);
    assert.equal(created.length, 1);
    assert.equal(created[0]!.sourceId, wallet.id);
    const again = await syncSystemReminders(ids.customer);
    assert.equal(again.length, 0);
    const due = await createCustomReminder(customer(), {
      title: "Due now",
      dueAt: new Date(Date.now() - 1000).toISOString(),
    });
    const n1 = await notifyDueReminders();
    const n2 = await notifyDueReminders();
    assert.ok(n1.notified >= 1);
    assert.equal(n2.notified, 0);
    await dismissReminder(customer(), due.id);
    const custom = await createCustomReminder(customer(), {
      title: "Call dealer",
      dueAt: new Date(Date.now() - 1000).toISOString(),
    });
    const listed = await listReminders(customer());
    assert.ok(listed.some((r) => r.bucket === "OVERDUE"));
    await completeReminder(customer(), created[0]!.id);
    await dismissReminder(customer(), custom.id);
    const future = await createCustomReminder(customer(), {
      title: "Later",
      dueAt: new Date(Date.now() + 86400000 * 3).toISOString(),
    });
    await snoozeReminder(customer(), future.id, new Date(Date.now() + 86400000 * 5).toISOString());
    await assert.rejects(() => completeReminder(customerB(), future.id), (e: SuperAppError) => e.code === "CROSS_TENANT");
  });

  it("media: ownership, watermark derivative, original preserved, plate, no documents", async () => {
    assert.throws(() => assertNotDocumentMime("application/pdf"), (e: SuperAppError) => e.code === "DOCUMENT_NOT_MEDIA");
    const asset = await registerMediaAsset(customer(), {
      buffer: JPEG,
      mimeType: "image/jpeg",
      mediaType: "IMAGE",
      plateMaskRegions: [{ x: 10, y: 10, w: 40, h: 12 }],
    });
    assert.equal(asset.processingState, "PROCESSED");
    assert.equal(asset.watermarkStatus, "APPLIED");
    assert.equal(asset.platePrivacyStatus, "MASKED");
    assert.notEqual(asset.processedPath, asset.originalPath);
    const orig = readFileSync(join(process.env.UPLOAD_DIR!, asset.originalPath));
    assert.equal(orig.equals(JPEG), true);
    const again = await processMediaAsset(customer(), asset.id);
    assert.equal(again.processedPath, asset.processedPath);
    await assert.rejects(() => processMediaAsset(customerB(), asset.id), (e: SuperAppError) => e.code === "CROSS_TENANT");
    await assert.rejects(
      () => reviewMediaAuthenticity(customer(), asset.id, "VERIFIED"),
      (e: SuperAppError) => e.code === "FORBIDDEN",
    );
    const verified = await reviewMediaAuthenticity(admin(), asset.id, "VERIFIED");
    assert.equal(verified.authenticityStatus, "VERIFIED");
  });

  it("sell request lifecycle, PII mask, valuations, atomic offer accept", async () => {
    const draft = await createSaleRequest(customer(), {
      brand: "Hyundai",
      model: "Creta",
      year: 2022,
      kmsDriven: 32000,
      fuelType: "Petrol",
      transmission: "Manual",
      city: "Pune",
      state: "MH",
      expectedPrice: 850000,
      vehicleId: ids.vehicle,
    });
    ids.sale = draft.id;
    assert.equal(draft.status, "DRAFT");
    const submitted = await submitSaleRequest(customer(), draft.id);
    assert.equal(submitted.status, "OPEN_FOR_OFFERS");
    await assert.rejects(() => submitSaleRequest(customerB(), draft.id), (e: SuperAppError) => e.code === "NOT_FOUND");
    const open = await listOpenSaleRequests(dealerA());
    const masked = open.find((r) => r.id === draft.id)!;
    const blob = JSON.stringify(masked);
    assert.equal(blob.includes("9111111111"), false);
    assert.equal(blob.includes(`${PREFIX}c@test.com`), false);
    assert.equal("customerUserId" in masked, false);
    const val = await submitValuation(valA(), {
      saleRequestId: draft.id,
      amountMin: 700000,
      amountMax: 780000,
      notes: "indicative professional valuation",
    });
    assert.equal(Number(val.amountMin), 700000);
    await assert.rejects(() => submitValuation(customer(), { saleRequestId: draft.id, amountMin: 1, amountMax: 2 }), (e: SuperAppError) => e.code === "FORBIDDEN");
    const queueB = await listValuationQueue(valB());
    const rowB = queueB.find((r) => r.id === draft.id);
    assert.ok(rowB);
    assert.equal(rowB!.valuations.length, 0);

    await assert.rejects(
      () => submitPurchaseOffer(dealerA(), { saleRequestId: draft.id, amount: 800000, dealerId: ids.dealerB }),
      (e: unknown) => (e instanceof SalesOsError || e instanceof SuperAppError) && (e as { code: string }).code === "FORGED_DEALER",
    );
    const offer = await submitPurchaseOffer(dealerA(), { saleRequestId: draft.id, amount: 810000, notes: "subject to inspection" });
    ids.offer = offer.id;
    const offer2 = await submitPurchaseOffer(dealerB(), {
      saleRequestId: draft.id,
      amount: 790000,
      validUntil: new Date(Date.now() - 1000).toISOString(),
    });
    ids.offer2 = offer2.id;
    await expireStaleOffers();
    const expired = await prisma.vehiclePurchaseOffer.findUnique({ where: { id: offer2.id } });
    assert.equal(expired?.status, "EXPIRED");
    const live = await submitPurchaseOffer(dealerB(), { saleRequestId: draft.id, amount: 795000 });
    await assert.rejects(() => withdrawOffer(dealerA(), live.id), (e: SuperAppError) => e.code === "CROSS_TENANT");
    await assert.rejects(() => acceptOffer(customerB(), offer.id), (e: SuperAppError) => e.code === "CROSS_TENANT");
    const accepted = await acceptOffer(customer(), offer.id);
    assert.equal(accepted.accepted, true);
    assert.equal(accepted.payment, false);
    const sale = await prisma.vehicleSaleRequest.findUnique({ where: { id: draft.id }, include: { offers: true } });
    assert.equal(sale?.status, "OFFER_ACCEPTED");
    assert.equal(sale?.offers.filter((o) => o.status === "ACCEPTED").length, 1);
    assert.ok(sale?.offers.some((o) => o.status === "REJECTED"));
    await assert.rejects(() => acceptOffer(customer(), live.id), (e: SuperAppError) => e.code === "INVALID_STATUS");
    await cancelSaleRequest(customer(), draft.id);
    const mine = await listMySaleRequests(customer());
    assert.ok(mine.some((s) => s.id === draft.id));
    const theirs = await listMySaleRequests(customerB());
    assert.equal(theirs.some((s) => s.id === draft.id), false);
  });

  it("customer 360 and activity aggregate real empty-safe sources", async () => {
    const snap = await getCustomer360(customer());
    assert.equal(snap.availability.ai_insights, false);
    assert.equal(snap.availability.fastag_provider, false);
    assert.equal(snap.availability.saved_searches, true);
    assert.ok(snap.saved_searches.length >= 1);
    assert.ok(snap.sell_requests.length >= 1);
    assert.equal(snap.rewards.balance, 42);
    assert.equal(snap.availability.rewards_ledger, true);
    assert.ok(Array.isArray(snap.quotations));
    const empty = await getCustomer360(customerB());
    assert.equal(empty.sell_requests.length, 0);
    assert.equal(empty.saved_searches.length, 0);
    const activity = await getCustomerActivity(customer());
    assert.ok(activity.some((e) => e.type === "sell_request"));
    assert.ok(activity.some((e) => e.type === "dealer_offer"));
  });

  it("mask helper never includes documents or VIN", () => {
    const masked = maskSaleRequest({
      id: "x",
      brand: "H",
      model: "C",
      variant: null,
      year: 2020,
      kmsDriven: 1,
      owners: 1,
      fuelType: "Petrol",
      transmission: "M",
      city: "Pune",
      state: "MH",
      expectedPrice: 1,
      status: "OPEN_FOR_OFFERS",
      conditionNotes: null,
      createdAt: new Date(),
    });
    assert.equal("registrationNumber" in masked, false);
    assert.equal("documents" in masked, false);
  });
});
