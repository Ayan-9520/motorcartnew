/**
 * DB-backed Batch 11 Partner / Industry OS tests. Local Docker PostgreSQL only.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "@/lib/prisma";
import { PartnerOsError } from "./errors";
import { createCrmActivity } from "@/services/sales-crm.service";
import {
  addCompatibility,
  applyToJob,
  authorizeDealer,
  createEstimate,
  createJob,
  createJobCard,
  createServiceSlot,
  decideEstimateItem,
  getPartOrder,
  grantCertification,
  issuePolicy,
  listEmployerApplications,
  listLenderApplications,
  listMyApplications,
  listSellerOrders,
  notifyClaim,
  oemAuthorizedForOrg,
  oemMetrics,
  persistPartnerQuote,
  listInsurerQuotes,
  placePartOrder,
  publicCompany,
  requestServiceBooking,
  searchParts,
  searchServiceCenters,
  serviceHistory,
  setApplicationStatus,
  setAuthorizationStatus,
  submitRating,
  upsertCoverage,
  upsertFinanceProduct,
  upsertPartProduct,
  withdrawApplication,
  partnersByPin,
} from "@/services/partner-industry.service";

process.env.FEATURE_SALES_OS = "true";

const PREFIX = `__b11_${Date.now()}_`;
const pinA = "411001";
const pinB = "400001";

const ids = {
  customer: "",
  customerB: "",
  admin: "",
  partsA: "",
  partsB: "",
  shopA: "",
  shopB: "",
  oemA: "",
  oemB: "",
  dealerOwner: "",
  lenderA: "",
  lenderB: "",
  insurerA: "",
  insurerB: "",
  orgPartsA: "",
  orgPartsB: "",
  orgShopA: "",
  orgShopB: "",
  orgOemA: "",
  orgOemB: "",
  orgDealer: "",
  orgBankA: "",
  orgBankB: "",
  orgInsA: "",
  orgInsB: "",
  dealerId: "",
  centerA: "",
  centerB: "",
  productA: "",
  bankA: "",
  partnerA: "",
};

function actor(userId: string, role: string) {
  return { userId, role };
}

async function org(type: string, userId: string, key: string) {
  const row = await prisma.organization.create({
    data: {
      type: type as never,
      name: `${PREFIX}${key}`,
      displayName: `${PREFIX}${key}`,
      slug: `${PREFIX}${key}`.slice(0, 60),
      createdByUserId: userId,
    },
  });
  await prisma.organizationMember.create({
    data: { organizationId: row.id, userId, role: "OWNER", status: "active" },
  });
  return row;
}

async function seed() {
  const customer = await prisma.user.create({
    data: { email: `${PREFIX}c@test.com`, fullName: "Cust", role: "customer", passwordHash: "x", phone: `91${Date.now().toString().slice(-8)}` },
  });
  const customerB = await prisma.user.create({
    data: { email: `${PREFIX}c2@test.com`, fullName: "Cust B", role: "customer", passwordHash: "x", phone: `92${Date.now().toString().slice(-8)}` },
  });
  const admin = await prisma.user.create({
    data: { email: `${PREFIX}admin@test.com`, fullName: "Admin", role: "super_admin", passwordHash: "x" },
  });
  const partsA = await prisma.user.create({
    data: { email: `${PREFIX}pa@test.com`, fullName: "Parts A", role: "parts_seller", passwordHash: "x" },
  });
  const partsB = await prisma.user.create({
    data: { email: `${PREFIX}pb@test.com`, fullName: "Parts B", role: "parts_seller", passwordHash: "x" },
  });
  const shopA = await prisma.user.create({
    data: { email: `${PREFIX}sa@test.com`, fullName: "Shop A", role: "service_center", passwordHash: "x" },
  });
  const shopB = await prisma.user.create({
    data: { email: `${PREFIX}sb@test.com`, fullName: "Shop B", role: "service_center", passwordHash: "x" },
  });
  const oemA = await prisma.user.create({
    data: { email: `${PREFIX}oa@test.com`, fullName: "OEM A", role: "dealer", passwordHash: "x" },
  });
  const oemB = await prisma.user.create({
    data: { email: `${PREFIX}ob@test.com`, fullName: "OEM B", role: "dealer", passwordHash: "x" },
  });
  const dealerOwner = await prisma.user.create({
    data: { email: `${PREFIX}do@test.com`, fullName: "Dealer", role: "dealer", passwordHash: "x" },
  });
  const lenderA = await prisma.user.create({
    data: { email: `${PREFIX}la@test.com`, fullName: "Lender A", role: "bank_nbfc", passwordHash: "x" },
  });
  const lenderB = await prisma.user.create({
    data: { email: `${PREFIX}lb@test.com`, fullName: "Lender B", role: "bank_nbfc", passwordHash: "x" },
  });
  const insurerA = await prisma.user.create({
    data: { email: `${PREFIX}ia@test.com`, fullName: "Ins A", role: "broker", passwordHash: "x" },
  });
  const insurerB = await prisma.user.create({
    data: { email: `${PREFIX}ib@test.com`, fullName: "Ins B", role: "broker", passwordHash: "x" },
  });

  const oPartsA = await org("PARTS_SELLER", partsA.id, "psa");
  const oPartsB = await org("PARTS_SELLER", partsB.id, "psb");
  const oShopA = await org("WORKSHOP", shopA.id, "wsa");
  const oShopB = await org("WORKSHOP", shopB.id, "wsb");
  const oOemA = await org("OEM", oemA.id, "oema");
  const oOemB = await org("OEM", oemB.id, "oemb");
  const dealer = await prisma.dealer.create({
    data: { ownerId: dealerOwner.id, name: `${PREFIX} Dealer`, slug: `${PREFIX}dlr`, city: "Pune", state: "MH", pincode: pinA },
  });
  const oDealer = await org("DEALER", dealerOwner.id, "dlrorg");
  await prisma.organization.update({ where: { id: oDealer.id }, data: { legacyDealerId: dealer.id } });
  const oBankA = await org("BANK", lenderA.id, "bnka");
  const oBankB = await org("NBFC", lenderB.id, "bnkb");
  const oInsA = await org("INSURANCE_COMPANY", insurerA.id, "insa");
  const oInsB = await org("INSURANCE_COMPANY", insurerB.id, "insb");

  const bankA = await prisma.bank.create({
    data: {
      name: `${PREFIX}BankA`,
      slug: `${PREFIX}bank-a`,
      interestRateMin: 9,
      interestRateMax: 11,
      maxLoanAmount: 2_000_000,
      organizationId: oBankA.id,
    },
  });
  const partnerA = await prisma.insurancePartner.create({
    data: { name: `${PREFIX}InsA`, slug: `${PREFIX}ins-a`, organizationId: oInsA.id },
  });
  await prisma.insurancePartner.create({
    data: { name: `${PREFIX}InsB`, slug: `${PREFIX}ins-b`, organizationId: oInsB.id },
  });

  const centerA = await prisma.serviceCenter.create({
    data: {
      ownerId: shopA.id,
      name: `${PREFIX} Shop A`,
      slug: `${PREFIX}shop-a`,
      city: "Pune",
      state: "MH",
      pincode: pinA,
    },
  });
  const centerB = await prisma.serviceCenter.create({
    data: {
      ownerId: shopB.id,
      name: `${PREFIX} Shop B`,
      slug: `${PREFIX}shop-b`,
      city: "Mumbai",
      state: "MH",
      pincode: pinB,
    },
  });

  Object.assign(ids, {
    customer: customer.id,
    customerB: customerB.id,
    admin: admin.id,
    partsA: partsA.id,
    partsB: partsB.id,
    shopA: shopA.id,
    shopB: shopB.id,
    oemA: oemA.id,
    oemB: oemB.id,
    dealerOwner: dealerOwner.id,
    lenderA: lenderA.id,
    lenderB: lenderB.id,
    insurerA: insurerA.id,
    insurerB: insurerB.id,
    orgPartsA: oPartsA.id,
    orgPartsB: oPartsB.id,
    orgShopA: oShopA.id,
    orgShopB: oShopB.id,
    orgOemA: oOemA.id,
    orgOemB: oOemB.id,
    orgDealer: oDealer.id,
    orgBankA: oBankA.id,
    orgBankB: oBankB.id,
    orgInsA: oInsA.id,
    orgInsB: oInsB.id,
    dealerId: dealer.id,
    centerA: centerA.id,
    centerB: centerB.id,
    bankA: bankA.id,
    partnerA: partnerA.id,
  });
}

before(async () => {
  await seed();
});

after(async () => {
  await prisma.insuranceClaim.deleteMany({ where: { organization: { slug: { startsWith: PREFIX } } } }).catch(() => {});
  await prisma.insurancePolicy.deleteMany({ where: { organization: { slug: { startsWith: PREFIX } } } }).catch(() => {});
  await prisma.insuranceQuote.deleteMany({ where: { userId: { in: [ids.customer, ids.customerB] } } }).catch(() => {});
  await prisma.jobApplication.deleteMany({ where: { organizationId: { in: [ids.orgOemA, ids.orgOemB, ids.orgDealer] } } }).catch(() => {});
  await prisma.jobPosting.deleteMany({ where: { organizationId: { in: [ids.orgOemA, ids.orgOemB, ids.orgDealer] } } }).catch(() => {});
  await prisma.serviceEstimate.deleteMany({ where: { organization: { slug: { startsWith: PREFIX } } } }).catch(() => {});
  await prisma.serviceSlot.deleteMany({ where: { organization: { slug: { startsWith: PREFIX } } } }).catch(() => {});
  await prisma.serviceJobCard.deleteMany({ where: { serviceCenterId: { in: [ids.centerA, ids.centerB] } } }).catch(() => {});
  await prisma.serviceBooking.deleteMany({ where: { serviceCenterId: { in: [ids.centerA, ids.centerB] } } }).catch(() => {});
  await prisma.partOrder.deleteMany({ where: { organizationId: { in: [ids.orgPartsA, ids.orgPartsB] } } }).catch(() => {});
  await prisma.partCompatibilityRule.deleteMany({ where: { partProduct: { organizationId: { in: [ids.orgPartsA, ids.orgPartsB] } } } }).catch(() => {});
  await prisma.partProduct.deleteMany({ where: { organizationId: { in: [ids.orgPartsA, ids.orgPartsB] } } }).catch(() => {});
  await prisma.part.deleteMany({ where: { sellerId: { in: [ids.partsA, ids.partsB] } } }).catch(() => {});
  await prisma.financeProduct.deleteMany({ where: { organizationId: { in: [ids.orgBankA, ids.orgBankB] } } }).catch(() => {});
  await prisma.financeApplication.deleteMany({ where: { bankId: ids.bankA } }).catch(() => {});
  await prisma.organizationDealerAuthorization.deleteMany({ where: { oemOrganizationId: { in: [ids.orgOemA, ids.orgOemB] } } }).catch(() => {});
  await prisma.organizationCoverage.deleteMany({ where: { organizationId: { in: [ids.orgPartsA, ids.orgShopA, ids.orgBankA, ids.orgInsA] } } }).catch(() => {});
  await prisma.partnerCertification.deleteMany({ where: { organizationId: { in: [ids.orgDealer, ids.orgPartsA] } } }).catch(() => {});
  await prisma.partnerRating.deleteMany({ where: { organizationId: ids.orgShopA } }).catch(() => {});
  await prisma.crmActivity.deleteMany({ where: { dealerId: ids.dealerId } }).catch(() => {});
  await prisma.lead.deleteMany({ where: { dealerId: ids.dealerId } }).catch(() => {});
  await prisma.serviceCenter.deleteMany({ where: { id: { in: [ids.centerA, ids.centerB] } } }).catch(() => {});
  await prisma.insurancePartner.deleteMany({ where: { slug: { startsWith: PREFIX } } }).catch(() => {});
  await prisma.bank.deleteMany({ where: { slug: { startsWith: PREFIX } } }).catch(() => {});
  await prisma.organizationMember.deleteMany({ where: { organization: { slug: { startsWith: PREFIX } } } }).catch(() => {});
  await prisma.organization.deleteMany({ where: { slug: { startsWith: PREFIX } } }).catch(() => {});
  await prisma.dealer.deleteMany({ where: { slug: { startsWith: PREFIX } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } }).catch(() => {});
  await prisma.$disconnect();
});

describe("Batch 11 PARTS", () => {
  it("isolates seller inventory, compatibility, PIN, and order ownership", async () => {
    const a = actor(ids.partsA, "parts_seller");
    const b = actor(ids.partsB, "parts_seller");
    const product = await upsertPartProduct(a, {
      name: "Brake Pad",
      sku: "BP-1",
      partNumber: "OEM-BP-99",
      brand: "Bosch",
      categorySlug: "brakes",
      vehicleCategory: "car",
      price: 1500,
      stock: 5,
      pincode: pinA,
    });
    ids.productA = product.id;
    await addCompatibility(a, product.id, { brand: "Hyundai", model: "Creta", yearFrom: 2020, yearTo: 2026 });
    await assert.rejects(() => addCompatibility(b, product.id, { brand: "Kia", model: "Seltos" }), PartnerOsError);
    const pinHits = await searchParts({ pincode: pinA, partNumber: "OEM-BP" });
    assert.ok(pinHits.some((p) => p.id === product.id));
    const otherPin = await searchParts({ pincode: pinB, partNumber: "OEM-BP" });
    assert.equal(otherPin.some((p) => p.id === product.id), false);
    const compat = await searchParts({ make: "Hyundai", model: "Creta" });
    assert.ok(compat.some((p) => p.id === product.id));
    const order = await placePartOrder(actor(ids.customer, "customer"), {
      sellerId: ids.partsA,
      items: [{ productId: product.id, qty: 1 }],
    });
    const mine = await getPartOrder(actor(ids.customer, "customer"), order.id);
    assert.equal(mine.id, order.id);
    await assert.rejects(() => getPartOrder(actor(ids.customerB, "customer"), order.id), PartnerOsError);
    const sellerOrders = await listSellerOrders(a);
    assert.ok(sellerOrders.some((o) => o.id === order.id));
    const otherSeller = await listSellerOrders(b);
    assert.equal(otherSeller.some((o) => o.id === order.id), false);
  });
});

describe("Batch 11 SERVICE", () => {
  it("isolates centers, booking, slots, job cards, estimates, history", async () => {
    const shop = actor(ids.shopA, "service_center");
    const other = actor(ids.shopB, "service_center");
    const cust = actor(ids.customer, "customer");
    const found = await searchServiceCenters(pinA);
    assert.ok(found.some((c) => c.id === ids.centerA));
    assert.equal(found.some((c) => c.id === ids.centerB), false);
    const slot = await createServiceSlot(shop, { serviceCenterId: ids.centerA, startsAt: new Date(Date.now() + 86400000).toISOString(), capacity: 1 });
    await assert.rejects(() => createServiceSlot(other, { serviceCenterId: ids.centerA, startsAt: new Date().toISOString() }), PartnerOsError);
    const booking = await requestServiceBooking(cust, { serviceCenterId: ids.centerA, slotId: slot.id });
    assert.equal(booking.serviceCenterId, ids.centerA);
    const card = await createJobCard(shop, { serviceCenterId: ids.centerA, bookingId: booking.id, complaint: "Brake noise", customerUserId: ids.customer });
    await assert.rejects(() => createJobCard(other, { serviceCenterId: ids.centerA, complaint: "x" }), PartnerOsError);
    const est = await createEstimate(shop, {
      serviceCenterId: ids.centerA,
      customerUserId: ids.customer,
      items: [
        { description: "Pads", amount: 2000 },
        { description: "Optional ceramic", amount: 8000 },
      ],
    });
    await decideEstimateItem(cust, est.items[0].id, true);
    await decideEstimateItem(cust, est.items[1].id, false);
    const reloaded = await prisma.serviceEstimateItem.findMany({ where: { estimateId: est.id } });
    assert.equal(reloaded.find((i) => i.description === "Pads")?.approved, true);
    assert.equal(reloaded.find((i) => i.description === "Optional ceramic")?.rejected, true);
    await prisma.serviceRecord.create({
      data: { userId: ids.customer, serviceType: "periodic", serviceCenter: ids.centerA, amount: 2000 },
    });
    const history = await serviceHistory(cust);
    assert.ok(history.records.length >= 1);
    assert.ok(card.id);
  });
});

describe("Batch 11 OEM", () => {
  it("isolates orgs, pending vs authorized, and real metrics only", async () => {
    const oem = actor(ids.oemA, "dealer");
    const other = actor(ids.oemB, "dealer");
    const pending = await authorizeDealer(oem, {
      dealerOrganizationId: ids.orgDealer,
      brand: "Hyundai",
      dealerId: ids.dealerId,
      status: "pending",
    });
    assert.equal(pending.status, "pending");
    await assert.rejects(
      () => authorizeDealer(oem, { dealerOrganizationId: ids.orgDealer, brand: "Kia", status: "authorized" }),
      PartnerOsError,
    );
    assert.equal(await oemAuthorizedForOrg(ids.orgDealer), false);
    const pagePending = await publicCompany(`${PREFIX}dlrorg`.slice(0, 60));
    assert.equal(pagePending.oemAuthorized.length, 0);
    await setAuthorizationStatus(actor(ids.admin, "super_admin"), pending.id, "authorized");
    assert.equal(await oemAuthorizedForOrg(ids.orgDealer), true);
    const metrics = await oemMetrics(oem);
    assert.equal(metrics.authorizedDealers, 1);
    const otherMetrics = await oemMetrics(other);
    assert.equal(otherMetrics.authorizedDealers, 0);
  });
});

describe("Batch 11 BANK/NBFC", () => {
  it("isolates lenders, product config, and applications", async () => {
    const la = actor(ids.lenderA, "bank_nbfc");
    const lb = actor(ids.lenderB, "bank_nbfc");
    const product = await upsertFinanceProduct(la, {
      name: "Car loan",
      loanType: "vehicle_loan",
      minAmount: 100000,
      maxAmount: 2000000,
      tenureMinMonths: 12,
      tenureMaxMonths: 60,
      rateMin: 9.5,
      bankId: ids.bankA,
    });
    assert.equal(product.organizationId, ids.orgBankA);
    await prisma.financeApplication.create({
      data: {
        userId: ids.customer,
        bankId: ids.bankA,
        amount: 500000,
        tenure: 36,
        loanAmount: 500000,
        tenureMonths: 36,
      },
    });
    const appsA = await listLenderApplications(la);
    assert.equal(appsA.length, 1);
    const appsB = await listLenderApplications(lb);
    assert.equal(appsB.length, 0);
  });
});

describe("Batch 11 INSURANCE", () => {
  it("isolates insurers, quote truth, policy, renewal, claims", async () => {
    const ins = actor(ids.insurerA, "broker");
    const other = actor(ids.insurerB, "broker");
    const quote = await persistPartnerQuote(ins, { userId: ids.customer, premium: 12000 });
    assert.equal(quote.quoteKind, "PARTNER_QUOTE");
    const others = await listInsurerQuotes(other);
    assert.equal(others.some((q) => q.id === quote.id), false);
    const policy = await issuePolicy(ins, {
      customerUserId: ids.customer,
      policyNumber: `${PREFIX}POL1`,
      policyType: "comprehensive",
      startAt: new Date().toISOString(),
      expiryAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      premium: 12000,
    });
    const renewal = await issuePolicy(ins, {
      customerUserId: ids.customer,
      policyNumber: `${PREFIX}POL2`,
      policyType: "comprehensive",
      startAt: new Date().toISOString(),
      expiryAt: new Date(Date.now() + 86400000 * 730).toISOString(),
      renewalOfId: policy.id,
    });
    assert.equal(renewal.renewalOfId, policy.id);
    const claim = await notifyClaim(actor(ids.customer, "customer"), {
      policyId: policy.id,
      incidentAt: new Date().toISOString(),
      description: "Rear bumper scrape",
    });
    assert.equal(claim.status, "NOTIFIED");
    await assert.rejects(
      () => notifyClaim(other, { policyId: policy.id, incidentAt: new Date().toISOString(), description: "x" }),
      PartnerOsError,
    );
  });
});

describe("Batch 11 COMPANY + JOBS + TRUST + ROUTING + CRM", () => {
  it("keeps public profiles safe and isolates job applications", async () => {
    const employer = actor(ids.oemA, "dealer");
    const job = await createJob(employer, { title: "Sales Executive", description: "Dealer sales", careerPath: "SALES", location: "Pune" });
    const app = await applyToJob(actor(ids.customer, "customer"), job.id, "Interested");
    const otherEmployer = await listEmployerApplications(actor(ids.oemB, "dealer"));
    assert.equal(otherEmployer.some((a) => a.id === app.id), false);
    const employerApps = await listEmployerApplications(employer);
    assert.ok(employerApps.some((a) => a.id === app.id));
    const mine = await listMyApplications(actor(ids.customer, "customer"));
    assert.ok(mine.some((a) => a.id === app.id));
    const otherMine = await listMyApplications(actor(ids.customerB, "customer"));
    assert.equal(otherMine.some((a) => a.id === app.id), false);
    await setApplicationStatus(employer, app.id, "SHORTLISTED");
    await withdrawApplication(actor(ids.customer, "customer"), app.id);
    const page = await publicCompany(`${PREFIX}oema`.slice(0, 60));
    assert.equal("email" in page, false);
    assert.equal("phone" in page, false);
    assert.ok(page.jobs.some((j) => j.id === job.id));
  });

  it("grants certifications only via admin and ratings stay real", async () => {
    await assert.rejects(
      () => grantCertification(actor(ids.oemA, "dealer"), ids.orgDealer, "MOTORCART_CERTIFIED", {}),
      PartnerOsError,
    );
    const cert = await grantCertification(actor(ids.admin, "super_admin"), ids.orgDealer, "MOTORCART_CERTIFIED", { kyc: true });
    assert.equal(cert.status, "GRANTED");
    const rating = await submitRating(actor(ids.customer, "customer"), ids.orgShopA, { overall: 5, service: 4 });
    assert.equal(rating.verified, false);
  });

  it("routes by domain+PIN without crossing domains", async () => {
    await upsertCoverage(actor(ids.lenderA, "bank_nbfc"), "FINANCE", pinA);
    await upsertCoverage(actor(ids.insurerA, "broker"), "INSURANCE", pinA);
    await upsertCoverage(actor(ids.shopA, "service_center"), "SERVICE", pinA);
    await upsertCoverage(actor(ids.partsA, "parts_seller"), "PARTS", pinA);
    const finance = await partnersByPin("FINANCE", pinA);
    const parts = await partnersByPin("PARTS", pinA);
    assert.ok(finance.some((r) => r.organizationId === ids.orgBankA));
    assert.equal(finance.some((r) => r.organizationId === ids.orgPartsA), false);
    assert.ok(parts.some((r) => r.organizationId === ids.orgPartsA));
  });

  it("reuses Batch 7 CRM engine", async () => {
    process.env.FEATURE_SALES_OS = "true";
    const lead = await prisma.lead.create({
      data: {
        dealerId: ids.dealerId,
        name: "Partner lead",
        phone: `93${Date.now().toString().slice(-8)}`,
        source: "partner-os",
      },
    });
    const activity = await createCrmActivity(actor(ids.dealerOwner, "dealer"), {
      leadId: lead.id,
      activityType: "NOTE",
      subject: "Partner OS follow-up",
    });
    assert.ok(activity.id);
  });
});
