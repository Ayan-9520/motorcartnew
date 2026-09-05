/**
 * DB-backed Batch 7 Sales OS tests. Local Docker PostgreSQL only.
 */
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { prisma } from "@/lib/prisma";
import { SalesOsError } from "./errors";
import { createConsent, createCrmActivity, createFollowUp, listCrmActivities, listFollowUps, logLeadCall, overrideLeadQuality, persistLeadQuality, withdrawConsent } from "@/services/sales-crm.service";
import { createOpportunity, linkOpportunityObject, listOpportunities, updateOpportunityStage } from "@/services/sales-opportunity.service";
import { listAssignments, manualAssign, routeLeadByPin, upsertCoverage } from "@/services/sales-routing.service";
import { acquireBoardLead, grantCredits, listBoard, publishToBoard } from "@/services/sales-board.service";
import { createQuotation } from "@/services/quotation.service";
import { createTestDrive } from "@/services/test-drive.service";
import { getCustomer360 } from "@/services/customer-360.service";
import { UNASSIGNED_DEALER_SLUG } from "@/lib/leads/enquiry.types";

process.env.FEATURE_LEAD_BOARD = "true";
process.env.FEATURE_PAID_LEADS = "true";
process.env.FEATURE_SALES_OS = "true";

const PREFIX = `__b7_${Date.now()}_`;
const ids = {
  customer: "",
  admin: "",
  ownerA: "",
  ownerB: "",
  dealerA: "",
  dealerB: "",
  orgA: "",
  orgB: "",
  lead: "",
  unassigned: "",
  listing: "",
  vehicle: "",
};

const dealerA = () => ({ userId: ids.ownerA, role: "dealer" });
const dealerB = () => ({ userId: ids.ownerB, role: "dealer" });
const admin = () => ({ userId: ids.admin, role: "super_admin" });
const customer = () => ({ userId: ids.customer, role: "customer" });

async function seed() {
  const customerU = await prisma.user.create({
    data: { email: `${PREFIX}c@test.com`, fullName: "Cust Seven", role: "customer", passwordHash: "x", phone: `98${Date.now().toString().slice(-8)}` },
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
  await prisma.organizationMember.createMany({
    data: [
      { organizationId: orgA.id, userId: ownerA.id, role: "OWNER", status: "active" },
      { organizationId: orgB.id, userId: ownerB.id, role: "OWNER", status: "active" },
    ],
  });
  await prisma.organizationEntitlement.createMany({
    data: [
      { organizationId: orgA.id, featureKey: "lead_board", granted: true },
      { organizationId: orgA.id, featureKey: "paid_leads", granted: true },
      { organizationId: orgB.id, featureKey: "lead_board", granted: true },
      { organizationId: orgB.id, featureKey: "paid_leads", granted: true },
    ],
  });
  let unassigned = await prisma.dealer.findFirst({ where: { slug: UNASSIGNED_DEALER_SLUG } });
  if (!unassigned) {
    unassigned = await prisma.dealer.create({
      data: {
        ownerId: adminU.id,
        name: "MotorCart Unassigned Queue",
        slug: UNASSIGNED_DEALER_SLUG,
        city: "Unassigned",
        state: "NA",
      },
    });
  }
  const vehicle = await prisma.vehicle.create({
    data: {
      dealerId: dA.id,
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
  const lead = await prisma.lead.create({
    data: {
      dealerId: dA.id,
      customerUserId: customerU.id,
      name: "Harsh Shah",
      phone: "9876543210",
      email: "harsh@example.com",
      source: "website",
      vehicleInterest: "Hyundai Creta",
      pincode: "411001",
      metadata: { budget: 1500000, timeline: "30d", finance: true, location: "Pune 411001" },
    },
  });
  ids.customer = customerU.id;
  ids.admin = adminU.id;
  ids.ownerA = ownerA.id;
  ids.ownerB = ownerB.id;
  ids.dealerA = dA.id;
  ids.dealerB = dB.id;
  ids.orgA = orgA.id;
  ids.orgB = orgB.id;
  ids.lead = lead.id;
  ids.unassigned = unassigned.id;
  ids.vehicle = vehicle.id;
}

describe("Batch 7 sales OS DB", () => {
  after(async () => {
    await prisma.leadAcquisition.deleteMany({ where: { dealerId: { in: [ids.dealerA, ids.dealerB] } } }).catch(() => undefined);
    await prisma.leadBoardListing.deleteMany({ where: { leadId: ids.lead } }).catch(() => undefined);
    await prisma.opportunityLink.deleteMany({ where: { opportunity: { dealerId: { in: [ids.dealerA, ids.dealerB] } } } }).catch(() => undefined);
    await prisma.crmActivity.deleteMany({ where: { dealerId: { in: [ids.dealerA, ids.dealerB] } } }).catch(() => undefined);
    await prisma.opportunity.deleteMany({ where: { dealerId: { in: [ids.dealerA, ids.dealerB] } } }).catch(() => undefined);
    await prisma.leadAssignment.deleteMany({ where: { dealerId: { in: [ids.dealerA, ids.dealerB] } } }).catch(() => undefined);
    await prisma.leadCreditLedger.deleteMany({ where: { account: { dealerId: { in: [ids.dealerA, ids.dealerB] } } } }).catch(() => undefined);
    await prisma.leadCreditAccount.deleteMany({ where: { dealerId: { in: [ids.dealerA, ids.dealerB] } } }).catch(() => undefined);
    await prisma.partnerCoverage.deleteMany({ where: { dealerId: { in: [ids.dealerA, ids.dealerB] } } }).catch(() => undefined);
    await prisma.customerConsent.deleteMany({ where: { leadId: ids.lead } }).catch(() => undefined);
    await prisma.crmTask.deleteMany({ where: { dealerId: { in: [ids.dealerA, ids.dealerB] } } }).catch(() => undefined);
    await prisma.leadCall.deleteMany({ where: { dealerId: { in: [ids.dealerA, ids.dealerB] } } }).catch(() => undefined);
    await prisma.lead.deleteMany({ where: { id: ids.lead } }).catch(() => undefined);
  });

  it("seeds and computes server-owned quality", async () => {
    await seed();
    const lead = await persistLeadQuality(ids.lead);
    assert.ok(["HOT", "WARM", "COLD", "UNQUALIFIED"].includes(lead.quality));
    assert.ok(lead.qualityScore >= 40);
  });

  it("allows authorized quality override and blocks cross-tenant", async () => {
    const updated = await overrideLeadQuality(dealerA(), ids.lead, "COLD", "manual review");
    assert.equal(updated.quality, "COLD");
    assert.equal(updated.qualityOverridden, true);
    await assert.rejects(() => overrideLeadQuality(dealerB(), ids.lead, "HOT"), (e: unknown) => e instanceof SalesOsError && e.code === "CROSS_TENANT");
  });

  it("creates and withdraws consent", async () => {
    const row = await createConsent(dealerA(), {
      leadId: ids.lead,
      channel: "WHATSAPP",
      purpose: "ENQUIRY_FOLLOWUP",
      source: "crm",
    });
    assert.equal(row.status, "GRANTED");
    const withdrawn = await withdrawConsent(dealerA(), row.id);
    assert.equal(withdrawn.status, "WITHDRAWN");
  });

  it("creates isolated CRM activities and logs calls", async () => {
    const act = await createCrmActivity(dealerA(), {
      leadId: ids.lead,
      activityType: "NOTE",
      subject: "Spoke to customer",
    });
    assert.equal(act.dealerId, ids.dealerA);
    const call = await logLeadCall(dealerA(), { leadId: ids.lead, disposition: "CONNECTED", notes: "logged only" });
    assert.equal(call.outcome, "CONNECTED");
    await assert.rejects(
      () => createCrmActivity(dealerB(), { leadId: ids.lead, activityType: "NOTE", subject: "x" }),
      (e: unknown) => e instanceof SalesOsError && e.code === "CROSS_TENANT",
    );
    const mine = await listCrmActivities(dealerA());
    const theirs = await listCrmActivities(dealerB());
    assert.ok(mine.some((a) => a.id === act.id));
    assert.equal(theirs.some((a) => a.id === act.id), false);
  });

  it("creates follow-ups and overdue bucket", async () => {
    const due = new Date(Date.now() - 86400000).toISOString();
    await createFollowUp(dealerA(), { leadId: ids.lead, title: "Call back", dueAt: due });
    const overdue = await listFollowUps(dealerA(), "overdue");
    assert.ok(overdue.length >= 1);
  });

  it("creates opportunity, links quotation/test-drive, lifecycle", async () => {
    const opp = await createOpportunity(dealerA(), { leadId: ids.lead });
    assert.equal(opp.status, "OPEN");
    const quote = await createQuotation(dealerA(), {
      customerUserId: ids.customer,
      dealerId: ids.dealerA,
      leadId: ids.lead,
      ex_showroom_amount: 500_000,
    });
    await linkOpportunityObject(dealerA(), opp.id, "QUOTATION", quote.id);
    const td = await createTestDrive(customer(), {
      dealerId: ids.dealerA,
      vehicleId: ids.vehicle,
      leadId: ids.lead,
      requestedStartAt: new Date(Date.now() + 86400000).toISOString(),
      requestedEndAt: new Date(Date.now() + 86400000 + 3600000).toISOString(),
    });
    await linkOpportunityObject(dealerA(), opp.id, "TEST_DRIVE", td.id);
    const qualified = await updateOpportunityStage(dealerA(), opp.id, "QUALIFIED");
    assert.equal(qualified.status, "QUALIFIED");
    const won = await updateOpportunityStage(dealerA(), opp.id, "WON");
    assert.equal(won.status, "WON");
    const listA = await listOpportunities(dealerA());
    const listB = await listOpportunities(dealerB());
    assert.ok(listA.some((o) => o.id === opp.id));
    assert.equal(listB.some((o) => o.id === opp.id), false);
  });

  it("routes by exact PIN with history and blocks unauthorized reassignment", async () => {
    await upsertCoverage(dealerB(), { postalCode: "560001", domain: "VEHICLE", priority: 50, routingMode: "STANDARD" });
    const floating = await prisma.lead.create({
      data: {
        dealerId: ids.unassigned,
        name: "Pin Lead",
        phone: "9999911111",
        source: "website",
        pincode: "560001",
        vehicleInterest: "Creta",
      },
    });
    const routed = await routeLeadByPin(floating.id, admin());
    assert.equal(routed.routed, true);
    const history = await listAssignments(admin(), floating.id);
    assert.ok(history.length >= 1);
    await assert.rejects(
      () => manualAssign(dealerA(), floating.id, ids.dealerA, "steal"),
      (e: unknown) => e instanceof SalesOsError && e.code === "FORBIDDEN",
    );
    await manualAssign(admin(), floating.id, ids.dealerA, "admin move");
    const after = await prisma.lead.findFirst({ where: { id: floating.id } });
    assert.equal(after?.dealerId, ids.dealerA);
  });

  it("masks PII on board, gates unpublished, exclusive double-acquire, credits", async () => {
    await grantCredits(admin(), ids.dealerA, 10, "test grant");
    await grantCredits(admin(), ids.dealerB, 10, "test grant");
    const listing = await publishToBoard(admin(), {
      leadId: ids.lead,
      creditCost: 3,
      routingMode: "EXCLUSIVE",
    });
    ids.listing = listing.id;
    const cards = await listBoard(dealerA());
    const card = cards.find((c) => c.id === listing.id);
    assert.ok(card);
    assert.equal(card!.phone.includes("3210"), true);
    assert.equal(card!.phone.includes("9876543210"), false);
    assert.ok(card!.customer.includes("*"));
    const hidden = await prisma.lead.create({
      data: { dealerId: ids.dealerA, name: "Hidden", phone: "9000000000", source: "web" },
    });
    const unpublished = await listBoard(dealerA());
    assert.equal(unpublished.some((c) => c.lead_ref === hidden.id.slice(0, 8)), false);

    const got = await acquireBoardLead(dealerA(), listing.id);
    assert.equal(got.contact.phone, "9876543210");
    await assert.rejects(() => acquireBoardLead(dealerA(), listing.id), (e: unknown) => e instanceof SalesOsError && e.code === "DUPLICATE_ACQUISITION");
    await assert.rejects(() => acquireBoardLead(dealerB(), listing.id), (e: unknown) => e instanceof SalesOsError);

    await assert.rejects(() => listBoard(customer()), (e: unknown) => e instanceof SalesOsError);

    const garage = await prisma.customerVehicle.count({ where: { userId: ids.customer } });
    assert.equal(garage, 0);
    const self360 = await getCustomer360(dealerA());
    assert.equal(JSON.stringify(self360).includes("harsh@example.com"), false);

    const sharedLead = await prisma.lead.create({
      data: { dealerId: ids.dealerA, name: "Shared Lead", phone: "9111100000", source: "web", vehicleInterest: "Nexon" },
    });
    const shared = await publishToBoard(admin(), { leadId: sharedLead.id, creditCost: 1, routingMode: "SHARED", sharedLimit: 2 });
    await acquireBoardLead(dealerA(), shared.id);
    await acquireBoardLead(dealerB(), shared.id);
    await assert.rejects(() => acquireBoardLead(dealerA(), shared.id), (e: unknown) => e instanceof SalesOsError);
    await assert.rejects(() => grantCredits(dealerA(), ids.dealerA, 5, "nope"), (e: unknown) => e instanceof SalesOsError && e.code === "FORBIDDEN");
    await assert.rejects(() => grantCredits(admin(), ids.dealerA, -9999, "too much"), (e: unknown) => e instanceof SalesOsError && e.code === "NEGATIVE_BALANCE");
  });

  it("blocks forged dealer/org on activity create", async () => {
    await assert.rejects(
      () => createCrmActivity(dealerA(), { leadId: ids.lead, activityType: "NOTE", subject: "x", dealerId: ids.dealerB }),
      (e: unknown) => e instanceof SalesOsError && e.code === "FORGED_DEALER",
    );
    await assert.rejects(
      () => createCrmActivity(dealerA(), { leadId: ids.lead, activityType: "NOTE", subject: "x", organizationId: ids.orgB }),
      (e: unknown) => e instanceof SalesOsError && e.code === "FORGED_ORGANIZATION",
    );
  });

  it("writes audit and notifications for commercial actions", async () => {
    const logs = await prisma.activityLog.count({ where: { userId: ids.admin } });
    assert.ok(logs >= 1);
    const notes = await prisma.notification.count({ where: { kind: "sales_os" } });
    assert.ok(notes >= 1);
  });
});
