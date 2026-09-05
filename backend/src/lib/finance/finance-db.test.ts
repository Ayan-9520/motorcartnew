/**
 * DB-backed Phase C finance marketplace tests.
 * Requires local Docker PostgreSQL with finance migration applied.
 */
import assert from "node:assert/strict";
import { describe, it, after } from "node:test";
import { prisma } from "@/lib/prisma";
import { FinanceError } from "./errors";
import {
  addApplicationDocument,
  advanceApplicationStatus,
  applySoftApproval,
  compareLenders,
  getApplication,
  getTimeline,
  listApplications,
  runEligibility,
  submitApplication,
} from "@/services/finance-marketplace.service";
import { dsaApplications, dsaCommissions, dsaLeads } from "@/services/finance-dsa.service";
import { lenderApplications } from "@/services/finance-lender.service";
import { ensureCommissionOnDisbursement } from "@/services/finance-commission.service";
import { isFinanceDeskRole } from "./errors";
import { runRpc } from "@/lib/db/rpc-handlers";

const PREFIX = `__fintest_${Date.now()}_`;
const ids = {
  customerA: "",
  customerB: "",
  dsaUserA: "",
  dsaUserB: "",
  lenderA: "",
  lenderB: "",
  manager: "",
  dsaA: "",
  dsaB: "",
  bankA: "",
  bankB: "",
};

async function seed() {
  const customerA = await prisma.user.create({
    data: { email: `${PREFIX}ca@test.com`, fullName: "Cust A", role: "customer", passwordHash: "x" },
  });
  const customerB = await prisma.user.create({
    data: { email: `${PREFIX}cb@test.com`, fullName: "Cust B", role: "customer", passwordHash: "x" },
  });
  const dsaUserA = await prisma.user.create({
    data: { email: `${PREFIX}dsa_a@test.com`, fullName: "DSA A", role: "dsa_agent", passwordHash: "x" },
  });
  const dsaUserB = await prisma.user.create({
    data: { email: `${PREFIX}dsa_b@test.com`, fullName: "DSA B", role: "dsa_agent", passwordHash: "x" },
  });
  const bankA = await prisma.bank.create({
    data: {
      name: `${PREFIX}Bank A`,
      slug: `${PREFIX}bank-a`,
      bankType: "bank",
      interestRateMin: 9,
      interestRateMax: 11,
      maxLoanAmount: 5000000,
      rankingScore: 90,
      minCibil: 650,
      shortCode: "BKA",
      isActive: true,
    },
  });
  const bankB = await prisma.bank.create({
    data: {
      name: `${PREFIX}Bank B`,
      slug: `${PREFIX}bank-b`,
      bankType: "nbfc",
      interestRateMin: 11,
      interestRateMax: 14,
      maxLoanAmount: 4000000,
      rankingScore: 70,
      minCibil: 620,
      shortCode: "BKB",
      isActive: true,
    },
  });
  const lenderA = await prisma.user.create({
    data: {
      email: `${PREFIX}lender_a@test.com`,
      fullName: "Lender A",
      role: "bank_nbfc",
      passwordHash: "x",
      metadata: { bank_slug: bankA.slug, bank_id: bankA.id },
    },
  });
  const lenderB = await prisma.user.create({
    data: {
      email: `${PREFIX}lender_b@test.com`,
      fullName: "Lender B",
      role: "bank_nbfc",
      passwordHash: "x",
      metadata: { bank_slug: bankB.slug, bank_id: bankB.id },
    },
  });
  const manager = await prisma.user.create({
    data: { email: `${PREFIX}fm@test.com`, fullName: "Fin Mgr", role: "finance_manager", passwordHash: "x" },
  });
  const dsaA = await prisma.dsaAgent.create({
    data: { userId: dsaUserA.id, commissionRate: 1.25, isActive: true, licenseNumber: `${PREFIX}A` },
  });
  const dsaB = await prisma.dsaAgent.create({
    data: { userId: dsaUserB.id, commissionRate: 1.0, isActive: true, licenseNumber: `${PREFIX}B` },
  });

  ids.customerA = customerA.id;
  ids.customerB = customerB.id;
  ids.dsaUserA = dsaUserA.id;
  ids.dsaUserB = dsaUserB.id;
  ids.lenderA = lenderA.id;
  ids.lenderB = lenderB.id;
  ids.manager = manager.id;
  ids.dsaA = dsaA.id;
  ids.dsaB = dsaB.id;
  ids.bankA = bankA.id;
  ids.bankB = bankB.id;
}

async function cleanup() {
  const userIds = [ids.customerA, ids.customerB, ids.dsaUserA, ids.dsaUserB, ids.lenderA, ids.lenderB, ids.manager].filter(Boolean);
  const apps = await prisma.financeApplication.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
  const appIds = apps.map((a) => a.id);
  if (appIds.length) {
    await prisma.financeSoftApproval.deleteMany({ where: { applicationId: { in: appIds } } });
    await prisma.financeApplicationDocument.deleteMany({ where: { applicationId: { in: appIds } } });
    await prisma.financeLenderOffer.deleteMany({ where: { applicationId: { in: appIds } } });
    await prisma.financeVerification.deleteMany({ where: { applicationId: { in: appIds } } });
    await prisma.financeStatusHistory.deleteMany({ where: { applicationId: { in: appIds } } });
    await prisma.financeCommission.deleteMany({ where: { applicationId: { in: appIds } } });
    await prisma.financeCrmTask.deleteMany({ where: { applicationId: { in: appIds } } });
    await prisma.financeApplication.deleteMany({ where: { id: { in: appIds } } });
  }
  await prisma.financeLenderOffer.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.financeEligibilityCheck.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.financeLead.deleteMany({ where: { userId: { in: userIds } } });
  if (ids.dsaA) await prisma.dsaAgent.deleteMany({ where: { id: { in: [ids.dsaA, ids.dsaB] } } });
  if (ids.bankA) await prisma.bank.deleteMany({ where: { id: { in: [ids.bankA, ids.bankB] } } });
  if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
}

describe("Phase C finance marketplace — PostgreSQL", async () => {
  await seed();
  after(cleanup);

  const customerA = { userId: "", role: "customer" };
  const customerB = { userId: "", role: "customer" };
  const dsaA = { userId: "", role: "dsa_agent" };
  const dsaB = { userId: "", role: "dsa_agent" };
  const lenderA = { userId: "", role: "bank_nbfc" };
  const lenderB = { userId: "", role: "bank_nbfc" };
  const manager = { userId: "", role: "finance_manager" };

  function bindActors() {
    customerA.userId = ids.customerA;
    customerB.userId = ids.customerB;
    dsaA.userId = ids.dsaUserA;
    dsaB.userId = ids.dsaUserB;
    lenderA.userId = ids.lenderA;
    lenderB.userId = ids.lenderB;
    manager.userId = ids.manager;
  }
  bindActors();

  it("creates an application with first-class columns and compatible metadata", async () => {
    const app = await submitApplication(customerA, {
      bankId: ids.bankA,
      loanAmount: 750000,
      tenureMonths: 48,
      interestRate: 10.5,
      monthlyIncome: 90000,
      cibilScore: 740,
      employmentType: "salaried",
      vehicleId: "veh-demo-1",
      applicantMetadata: { city: "Pune", aadhaar: "should-strip" },
    });
    await prisma.financeApplication.update({
      where: { id: app.id },
      data: { dsaAgentId: ids.dsaA, bankId: ids.bankA },
    });
    const stored = await prisma.financeApplication.findUniqueOrThrow({ where: { id: app.id } });
    assert.equal(Number(stored.loanAmount), 750000);
    assert.equal(Number(stored.amount), 750000);
    assert.equal(stored.tenureMonths, 48);
    assert.equal(stored.tenure, 48);
    assert.equal(stored.vehicleId, "veh-demo-1");
    assert.equal(stored.dsaAgentId, ids.dsaA);
    assert.equal(stored.status, "submitted");
    const meta = stored.metadata as Record<string, unknown>;
    assert.equal(meta.vehicle_id, "veh-demo-1");
    const applicant = stored.applicantMetadata as Record<string, unknown>;
    assert.equal(applicant.aadhaar, undefined);
    assert.equal(applicant.city, "Pune");
  });

  it("lists only the customer's own applications", async () => {
    await submitApplication(customerB, {
      bankId: ids.bankB,
      loanAmount: 400000,
      tenureMonths: 36,
    });
    const listB0 = await listApplications(customerB);
    await prisma.financeApplication.update({
      where: { id: listB0[0]!.id },
      data: { dsaAgentId: ids.dsaB, bankId: ids.bankB },
    });
    const listA = await listApplications(customerA);
    const listB = await listApplications(customerB);
    assert.ok(listA.every((a) => a.userId === ids.customerA));
    assert.ok(listB.every((a) => a.userId === ids.customerB));
    assert.ok(listA.length >= 1);
    assert.ok(listB.length >= 1);
  });

  it("forbids application detail across customers", async () => {
    const listB = await listApplications(customerB);
    await assert.rejects(() => getApplication(customerA, listB[0]!.id), FinanceError);
  });

  it("records a timeline and advances status without confusing soft approval", async () => {
    const listA = await listApplications(customerA);
    const id = listA[0]!.id;
    const processing = await advanceApplicationStatus(manager, id, "processing", "docs");
    assert.equal(processing.status, "processing");
    const timeline = await getTimeline(customerA, id);
    assert.ok(timeline.length >= 2);
    assert.equal(timeline[0]?.toStatus ?? timeline[0]?.status, "submitted");
    assert.ok(timeline.some((h) => (h.toStatus ?? h.status) === "processing"));
  });

  it("runs eligibility audit with bands, not raw income", async () => {
    const result = await runEligibility(customerA, {
      monthlyIncome: 88000,
      existingEmi: 5000,
      loanAmount: 600000,
      tenureMonths: 60,
      cibilScore: 710,
      employmentType: "salaried",
    });
    assert.equal(typeof result.eligible, "boolean");
    assert.equal(result.monthly_income_band, "50k-100k");
    assert.equal(result.cibil_band, "700-749");
    const stored = await prisma.financeEligibilityCheck.findUnique({ where: { id: result.check_id } });
    assert.ok(stored);
    assert.equal(stored?.monthlyIncomeBand, "50k-100k");
  });

  it("persists compare offers from the bank catalog", async () => {
    const compared = await compareLenders(customerA, {
      loanAmount: 900000,
      tenureMonths: 60,
      monthlyIncome: 100000,
      cibilScore: 760,
      employmentType: "salaried",
    });
    assert.ok(compared.comparison_session_id);
    const rows = await prisma.financeLenderOffer.findMany({
      where: { comparisonSessionId: compared.comparison_session_id },
    });
    assert.ok(rows.length >= 1);
  });

  it("applies soft approval without setting FinanceStatus=approved", async () => {
    const listA = await listApplications(customerA);
    const id = listA[0]!.id;
    const before = await prisma.financeApplication.findUniqueOrThrow({ where: { id } });
    const updated = await applySoftApproval(lenderA, id, "pre_approved", "looks good");
    assert.equal(updated.softApprovalStatus, "pre_approved");
    assert.notEqual(updated.status, "approved");
    assert.equal(updated.status, before.status);
    const events = await prisma.financeSoftApproval.findMany({ where: { applicationId: id } });
    assert.ok(events.length >= 1);
  });

  it("stores documents for the owner only", async () => {
    const listA = await listApplications(customerA);
    const id = listA[0]!.id;
    const doc = await addApplicationDocument(customerA, id, {
      docType: "pan",
      fileName: "pan.pdf",
      fileUrl: "/uploads/finance-documents/pan.pdf",
    });
    assert.equal(doc.docType, "pan");
    const listB = await listApplications(customerB);
    await assert.rejects(
      () =>
        addApplicationDocument(customerA, listB[0]!.id, {
          fileName: "x.pdf",
          fileUrl: "/uploads/x.pdf",
        }),
      FinanceError,
    );
  });

  it("scopes DSA applications, leads, and commissions", async () => {
    await prisma.financeLead.create({
      data: {
        userId: ids.customerA,
        dsaId: ids.dsaA,
        assignedDsaId: ids.dsaA,
        amount: 100000,
        loanAmount: 100000n,
        source: "marketplace",
        phone: "9999999999",
      },
    });
    const appsA = await dsaApplications(dsaA);
    const appsB = await dsaApplications(dsaB);
    assert.ok(appsA.every((a) => a.dsaAgentId === ids.dsaA));
    assert.ok(appsB.every((a) => a.dsaAgentId === ids.dsaB));
    const leadsA = await dsaLeads(dsaA);
    const leadsB = await dsaLeads(dsaB);
    assert.ok(leadsA.every((l) => l.assignedDsaId === ids.dsaA || l.dsaId === ids.dsaA));
    assert.ok(leadsB.every((l) => l.assignedDsaId === ids.dsaB || l.dsaId === ids.dsaB));
    const commA = await dsaCommissions(dsaA);
    const commB = await dsaCommissions(dsaB);
    assert.ok(commA.every((c) => c.dsaAgentId === ids.dsaA));
    assert.ok(commB.every((c) => c.dsaAgentId === ids.dsaB));
  });

  it("scopes lender applications to metadata bank_id/bank_slug", async () => {
    const appsA = await lenderApplications(lenderA);
    const appsB = await lenderApplications(lenderB);
    assert.ok(appsA.every((a) => a.bankId === ids.bankA));
    assert.ok(appsB.every((a) => a.bankId === ids.bankB));
    const listA = await listApplications(customerA);
    await assert.rejects(() => getApplication(lenderB, listA[0]!.id), FinanceError);
  });

  it("creates exactly one commission on disbursement", async () => {
    const listA = await listApplications(customerA);
    const id = listA[0]!.id;
    await advanceApplicationStatus(manager, id, "approved", "sanctioned");
    await advanceApplicationStatus(manager, id, "disbursed", "paid out");
    const first = await ensureCommissionOnDisbursement(id);
    const second = await ensureCommissionOnDisbursement(id);
    assert.equal(second.created, false);
    const rows = await prisma.financeCommission.findMany({ where: { applicationId: id } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.dsaAgentId, ids.dsaA);
    assert.ok(first.commission);
  });

  it("protects admin finance list roles", () => {
    assert.equal(isFinanceDeskRole("customer"), false);
    assert.equal(isFinanceDeskRole("dsa_agent"), false);
    assert.equal(isFinanceDeskRole("finance_manager"), true);
    assert.equal(isFinanceDeskRole("admin"), true);
  });

  it("keeps RPC submit writing first-class columns (flag-off compatible path)", async () => {
    const rpc = (await runRpc(
      "submit_finance_application",
      {
        p_bank_id: ids.bankB,
        p_loan_amount: 250000,
        p_tenure_months: 24,
        p_monthly_income: 50000,
        p_cibil_score: 700,
      },
      { sub: ids.customerB, role: "customer" },
    )) as { ok: boolean; application_id: string };
    assert.equal(rpc.ok, true);
    const row = await prisma.financeApplication.findUniqueOrThrow({ where: { id: rpc.application_id } });
    assert.equal(Number(row.loanAmount), 250000);
    assert.equal(Number(row.amount), 250000);
    assert.equal(row.tenureMonths, 24);
    assert.equal(row.tenure, 24);
  });
});
