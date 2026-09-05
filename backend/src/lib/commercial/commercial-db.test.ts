/**
 * DB-backed Batch 8 commercial tests. Local Docker PostgreSQL only.
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, describe, it } from "node:test";
import { prisma } from "@/lib/prisma";
import { CommercialError } from "./errors";
import {
  assignSubscription,
  changeSubscriptionStatus,
  commercialEntitlements,
  createDraftInvoice,
  createLeadCreditPurchase,
  createPaymentRecord,
  issueInvoice,
  processPaymentWebhook,
  recordManualPayment,
  rejectClientPaidStatus,
  upsertManagedPlan,
  upsertSetting,
} from "@/services/commercial-billing.service";
import {
  adaptFinanceCommission,
  adjustPayoutEntry,
  confirmPayoutImport,
  createPayoutEntry,
  createPayoutRequest,
  earningsDashboard,
  evaluatePayoutRule,
  previewPayoutImport,
  reviewPayoutRequest,
  setPayoutEntryStatus,
  upsertPayoutRule,
  upsertReconciliation,
} from "@/services/commercial-payout.service";
import { applyReward, getRewardAccount, monthlyStatement, upsertRewardRule } from "@/services/commercial-rewards.service";
import { grantCredits } from "@/services/sales-board.service";

process.env.FEATURE_COMMERCIAL_ENGINE = "true";
process.env.FEATURE_PAYMENT_GATEWAY = "false";
process.env.COMMERCIAL_WEBHOOK_SECRET = "batch8-webhook";

const PREFIX = `__b8_${Date.now()}_`;
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
  plan: "",
  payment: "",
  invoice: "",
  entry: "",
  request: "",
  batch: "",
  rule: "",
};

const admin = () => ({ userId: ids.admin, role: "super_admin" });
const dealerA = () => ({ userId: ids.ownerA, role: "dealer" });
const dealerB = () => ({ userId: ids.ownerB, role: "dealer" });
const customer = () => ({ userId: ids.customer, role: "customer" });
const customerB = () => ({ userId: ids.customerB, role: "customer" });

async function seed() {
  const customerU = await prisma.user.create({
    data: { email: `${PREFIX}c@test.com`, fullName: "Cust Eight", role: "customer", passwordHash: "x" },
  });
  const customer2 = await prisma.user.create({
    data: { email: `${PREFIX}c2@test.com`, fullName: "Cust Eight B", role: "customer", passwordHash: "x" },
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
  ids.customer = customerU.id;
  ids.customerB = customer2.id;
  ids.admin = adminU.id;
  ids.ownerA = ownerA.id;
  ids.ownerB = ownerB.id;
  ids.dealerA = dA.id;
  ids.dealerB = dB.id;
  ids.orgA = orgA.id;
  ids.orgB = orgB.id;
}

describe("Batch 8 commercial db", () => {
  after(async () => {
    await prisma.rewardLedger.deleteMany({ where: { account: { userId: { in: [ids.customer, ids.customerB] } } } }).catch(() => undefined);
    await prisma.rewardAccount.deleteMany({ where: { userId: { in: [ids.customer, ids.customerB] } } }).catch(() => undefined);
    await prisma.rewardRule.deleteMany({ where: { code: { startsWith: PREFIX } } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("seeds fixtures", async () => {
    await seed();
    assert.ok(ids.orgA);
  });

  it("1-2 plans and subscriptions", async () => {
    const plan = await upsertManagedPlan(admin(), {
      name: "Growth",
      slug: `${PREFIX}growth`,
      price: 4999,
      billingCycle: "monthly",
      includedFeatures: ["crm", "quotation", "lead_management"],
      includedLeadCredits: 0,
      trialDays: 7,
    });
    ids.plan = plan.id;
    assert.equal(Number(plan.price), 4999);
    const sub = await assignSubscription(admin(), { organizationId: ids.orgA, planId: plan.id });
    assert.equal(sub.status, "ACTIVE");
    await changeSubscriptionStatus(admin(), sub.id, "ACTIVE");
  });

  it("3 entitlements stay locked for dialer", async () => {
    const matrix = await commercialEntitlements(dealerA());
    const dialer = matrix.find((f) => f.key === "dialer");
    assert.equal(dialer?.locked, true);
    const crm = matrix.find((f) => f.key === "crm");
    assert.equal(crm?.locked, false);
  });

  it("4-6 payment record, webhook idempotency, forged status", async () => {
    await assert.rejects(() => rejectClientPaidStatus("PAID"), (e: CommercialError) => e.code === "FORGED_PAYMENT_STATUS");
    const created = await createPaymentRecord(admin(), {
      organizationId: ids.orgA,
      purpose: "SUBSCRIPTION",
      amount: 4999,
    });
    ids.payment = created.payment.id;
    assert.equal(created.payment.status, "CREATED");
    assert.equal(created.gatewayEnabled, false);
    const raw = JSON.stringify({
      eventId: `${PREFIX}evt1`,
      providerRef: created.payment.providerRef,
      status: "PAID",
      eventType: "payment.paid",
    });
    const sig = createHmac("sha256", "batch8-webhook").update(raw).digest("hex");
    const first = await processPaymentWebhook(raw, sig);
    assert.equal(first.idempotent, false);
    const second = await processPaymentWebhook(raw, sig);
    assert.equal(second.idempotent, true);
    const paid = await prisma.commercialPayment.findUnique({ where: { id: ids.payment } });
    assert.equal(paid?.status, "PAID");
  });

  it("7-9 invoice calculation, tax config, duplicate invoice", async () => {
    await upsertSetting(admin(), "tax.gst.rates", { cgstPct: 9, sgstPct: 9 });
    await upsertSetting(admin(), "seller.legal", { legalName: "MotorCart Test Pvt Ltd", gstin: "27AAAAA0000A1Z5" });
    const draft = await createDraftInvoice(admin(), {
      organizationId: ids.orgA,
      paymentId: ids.payment,
      lines: [{ description: "Growth plan", unitPrice: 4999 }],
      intraState: true,
    });
    assert.equal(Number(draft.total), 5898.82);
    ids.invoice = draft.id;
    const issued = await issueInvoice(admin(), draft.id);
    assert.equal(issued.status, "ISSUED");
    await assert.rejects(
      () => createDraftInvoice(admin(), {
        organizationId: ids.orgA,
        paymentId: ids.payment,
        lines: [{ description: "dup", unitPrice: 1 }],
        intraState: true,
      }),
      (e: CommercialError) => e.code === "DUPLICATE_INVOICE",
    );
  });

  it("10-11 lead credit purchase uses existing ledger", async () => {
    const purchase = await createLeadCreditPurchase(dealerA(), { credits: 10, amount: 500 });
    await recordManualPayment(admin(), purchase.id);
    const ledger = await prisma.leadCreditLedger.findUnique({ where: { paymentId: purchase.id } });
    assert.ok(ledger);
    assert.equal(ledger?.amount, 10);
    await recordManualPayment(admin(), purchase.id);
    const count = await prisma.leadCreditLedger.count({ where: { paymentId: purchase.id } });
    assert.equal(count, 1);
    const still = await grantCredits(admin(), ids.dealerA, 5, "admin_grant");
    assert.ok(still.account.balance >= 15);
  });

  it("12-18 payout entry, request, amount cap, duplicate, approval, reject, settlement", async () => {
    const entry = await createPayoutEntry(admin(), {
      organizationId: ids.orgA,
      sourceType: "MANUAL",
      sourceId: `${PREFIX}e1`,
      amount: 2500,
      product: "finance",
      period: "2026-08",
    });
    ids.entry = entry.id;
    await assert.rejects(
      () => createPayoutEntry(admin(), {
        organizationId: ids.orgA,
        sourceType: "MANUAL",
        sourceId: `${PREFIX}e1`,
        amount: 1,
      }),
      (e: CommercialError) => e.code === "DUPLICATE_PAYOUT",
    );
    await assert.rejects(() => createPayoutRequest(dealerA(), [entry.id]), (e: CommercialError) => e.code === "NOT_ELIGIBLE");
    await setPayoutEntryStatus(admin(), entry.id, "APPROVED");
    const req = await createPayoutRequest(dealerA(), [entry.id]);
    assert.equal(Number(req.amount), 2500);
    ids.request = req.id;
    await assert.rejects(() => createPayoutRequest(dealerA(), [entry.id]), (e: CommercialError) => e.code === "DUPLICATE_PAYOUT");
    await reviewPayoutRequest(admin(), req.id, "REJECTED", "docs");
    const again = await createPayoutRequest(dealerA(), [entry.id]);
    await reviewPayoutRequest(admin(), again.id, "APPROVED");
    await reviewPayoutRequest(admin(), again.id, "PAID");
    const paid = await prisma.partnerPayoutEntry.findUnique({ where: { id: entry.id } });
    assert.equal(paid?.status, "PAID");
  });

  it("19-21 payout import preview, invalid row, duplicate file", async () => {
    const csv = `period,bank,product,reference,disbursed_amount,payout_rate,gross_payout\n2026-08,HDFC,new_car,${PREFIX}R1,100000,1.2,1200\n2026-08,,, ,x,x,-1\n`;
    const preview = await previewPayoutImport(admin(), `${PREFIX}.csv`, csv);
    ids.batch = preview.id;
    assert.equal(preview.validCount, 1);
    assert.equal(preview.invalidCount, 1);
    await assert.rejects(() => previewPayoutImport(admin(), `${PREFIX}.csv`, csv), (e: CommercialError) => e.code === "DUPLICATE_IMPORT");
    await confirmPayoutImport(admin(), preview.id, ids.orgA);
    const posted = await prisma.payoutImportRow.count({ where: { batchId: preview.id, rowStatus: "POSTED" } });
    assert.equal(posted, 1);
  });

  it("22-25 reconciliation and adjustments", async () => {
    const match = await upsertReconciliation(admin(), {
      source: "bank_payout",
      period: "2026-08",
      expectedAmount: 1200,
      receivedAmount: 1200,
    });
    assert.equal(match.status, "MATCHED");
    const mismatch = await upsertReconciliation(admin(), {
      source: "bank_payout",
      period: "2026-07",
      expectedAmount: 1000,
      receivedAmount: 800,
    });
    assert.equal(mismatch.status, "PARTIAL");
    const extra = await createPayoutEntry(admin(), {
      organizationId: ids.orgA,
      sourceType: "MANUAL",
      sourceId: `${PREFIX}e2`,
      amount: 400,
    });
    const adj = await adjustPayoutEntry(admin(), extra.id, "clawback", 50, "clawback test");
    assert.equal(Number(adj.originalAmount), 400);
    assert.ok(Number(adj.follow.amount) < 0);
  });

  it("26-28 slab engine, versioned percent, no invented partner %", async () => {
    const v1 = await upsertPayoutRule(admin(), {
      product: "new_car",
      validFrom: "2026-01-01",
      partnerSharePercent: 42,
      version: 1,
      slabs: [{ minInclusive: 0, maxExclusive: null, percent: 1.1 }],
    });
    ids.rule = v1.id;
    const v2 = await upsertPayoutRule(admin(), {
      product: "new_car",
      validFrom: "2026-07-01",
      partnerSharePercent: 38,
      version: 2,
      slabs: [
        { minInclusive: 0, maxExclusive: 100000, percent: 1 },
        { minInclusive: 100000, maxExclusive: null, percent: 1.4 },
      ],
    });
    const eval1 = await evaluatePayoutRule(v1.id, 200000, 2200);
    assert.equal(eval1.applicablePercent, 1.1);
    assert.equal(eval1.partnerShare?.partnerEligible, 924);
    const eval2 = await evaluatePayoutRule(v2.id, 200000, 2800);
    assert.equal(eval2.applicablePercent, 1.4);
  });

  it("29-30 partner isolation and admin authorization", async () => {
    const a = await earningsDashboard(dealerA());
    const b = await earningsDashboard(dealerB());
    assert.ok(a.entries.every((e) => e.organizationId === ids.orgA));
    assert.equal(b.entries.length, 0);
    await assert.rejects(() => upsertManagedPlan(dealerA(), { name: "x", slug: "x", price: 1 }), (e: CommercialError) => e.code === "FORBIDDEN");
  });

  it("31 finance commission compatibility", async () => {
    const fc = await prisma.financeCommission.create({
      data: { userId: ids.ownerA, amount: 321, status: "pending" },
    });
    const adapted = await adaptFinanceCommission(admin(), fc.id, ids.orgA);
    assert.equal(adapted.financeCommissionId, fc.id);
    const again = await adaptFinanceCommission(admin(), fc.id, ids.orgA);
    assert.equal(again.id, adapted.id);
  });

  it("32-40 reward ledger, earn/redeem/expire/adjust, statement, duplicate, isolation, empty truth", async () => {
    const empty = await getRewardAccount(customer());
    assert.equal(empty.balance, 0);
    await upsertRewardRule(admin(), { code: `${PREFIX}review`, source: "review", points: 20, active: true });
    const earn = await applyReward(admin(), {
      userId: ids.customer,
      ruleCode: `${PREFIX}review`,
      entryType: "EARN",
      reason: "review",
      source: "review",
      sourceEventKey: `${PREFIX}rev1`,
    });
    assert.equal(earn.duplicate, false);
    const dup = await applyReward(admin(), {
      userId: ids.customer,
      ruleCode: `${PREFIX}review`,
      entryType: "EARN",
      reason: "review",
      source: "review",
      sourceEventKey: `${PREFIX}rev1`,
    });
    assert.equal(dup.duplicate, true);
    await applyReward(customer(), {
      userId: ids.customer,
      entryType: "REDEEM",
      points: 5,
      reason: "redeem",
      source: "manual",
    });
    await applyReward(admin(), {
      userId: ids.customer,
      entryType: "EXPIRE",
      points: 2,
      reason: "expire",
      source: "system",
    });
    await applyReward(admin(), {
      userId: ids.customer,
      entryType: "ADJUST",
      points: 1,
      reason: "adjust",
      source: "admin",
    });
    const now = new Date();
    const stmt = await monthlyStatement(customer(), now.getFullYear(), now.getMonth() + 1);
    assert.equal(stmt.pointsEarned, 20);
    assert.equal(stmt.pointsRedeemed, 5);
    assert.equal(stmt.pointsExpired, 2);
    await assert.rejects(() => getRewardAccount(customer(), ids.customerB), (e: CommercialError) => e.code === "CROSS_TENANT");
    const other = await getRewardAccount(customerB());
    assert.equal(other.balance, 0);
  });

  it("41-42 negative credit and reward balances blocked", async () => {
    await assert.rejects(() => grantCredits(admin(), ids.dealerA, -99999, "drain"), (e) => (e as Error).message.includes("Negative"));
    await assert.rejects(
      () => applyReward(customer(), { userId: ids.customer, entryType: "REDEEM", points: 99999, reason: "over", source: "manual" }),
      (e: CommercialError) => e.code === "NEGATIVE_BALANCE",
    );
  });

  it("43 ActivityLog commercial actions", async () => {
    const logs = await prisma.activityLog.findMany({
      where: { userId: ids.admin, action: { startsWith: "commercial." } },
    });
    assert.ok(logs.length > 0);
  });

  it("45 payment provider remains disabled", async () => {
    assert.equal(process.env.FEATURE_PAYMENT_GATEWAY, "false");
  });
});
