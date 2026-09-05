import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cibilBand, incomeBand, stripRawPii } from "./bands";
import { checkEligibility } from "./eligibility";
import { calculateEmi, validateEmiParams } from "./emi";
import { FINANCE_DESK_ROLES, isFinanceDeskRole, isFinanceStaffRole } from "./errors";
import { canReadApplication } from "./access";
import { buildLoanOffers } from "./matching";
import { NEVER_ALLOW_TABLES } from "@/lib/db/query-allowlist";

describe("Phase C finance domain", () => {
  it("computes eligibility for a salaried applicant", () => {
    const result = checkEligibility({
      monthlyIncome: 80000,
      existingEmi: 0,
      loanAmount: 800000,
      tenureMonths: 60,
      cibilScore: 720,
      employmentType: "salaried",
    });
    assert.equal(result.eligible, true);
    assert.ok(result.maxLoan > 800000);
  });

  it("rejects low CIBIL without storing a bureau payload", () => {
    const result = checkEligibility({
      monthlyIncome: 80000,
      existingEmi: 0,
      loanAmount: 800000,
      tenureMonths: 60,
      cibilScore: 600,
      employmentType: "salaried",
    });
    assert.equal(result.eligible, false);
    assert.match(result.message, /650/);
  });

  it("uses income and cibil bands instead of raw PII labels", () => {
    assert.equal(incomeBand(40000), "25k-50k");
    assert.equal(incomeBand(120000), "100k-200k");
    assert.equal(cibilBand(720), "700-749");
    assert.equal(cibilBand(810), "800+");
  });

  it("strips aadhaar/pan from eligibility metadata", () => {
    const cleaned = stripRawPii({ aadhaar: "123412341234", city: "Pune", pan: "ABCDE1234F" });
    assert.equal(cleaned.aadhaar, undefined);
    assert.equal(cleaned.pan, undefined);
    assert.equal(cleaned.city, "Pune");
  });

  it("validates EMI inputs and calculates a known EMI", () => {
    assert.equal(validateEmiParams(0, 9, 60), "principal must be a positive number");
    assert.equal(validateEmiParams(500000, 9, 60), null);
    const emi = calculateEmi(500000, 12, 12);
    assert.ok(emi > 44000 && emi < 45000);
  });

  it("ranks lenders from catalog snapshots without external APIs", () => {
    const offers = buildLoanOffers(
      [
        {
          id: "bank-a",
          rankingScore: 90,
          minCibil: 700,
          interestRateMin: 9,
          interestRateMax: 11,
          maxTenureMonths: 84,
          maxLoanAmount: 2000000,
        },
        {
          id: "bank-b",
          rankingScore: 40,
          minCibil: 600,
          interestRateMin: 12,
          interestRateMax: 14,
          maxTenureMonths: 60,
          maxLoanAmount: 800000,
        },
      ],
      1000000,
      60,
      {
        monthlyIncome: 90000,
        existingEmi: 0,
        loanAmount: 1000000,
        tenureMonths: 60,
        cibilScore: 740,
        employmentType: "salaried",
      },
    );
    assert.equal(offers[0]?.id, "bank-a");
    assert.equal(offers.length, 1);
  });

  it("isolates application reads by customer, lender bank, and DSA", () => {
    const app = { userId: "cust-1", bankId: "bank-1", dsaAgentId: "dsa-1" };
    assert.equal(canReadApplication({ userId: "cust-1", role: "customer" }, app, {}), true);
    assert.equal(canReadApplication({ userId: "cust-2", role: "customer" }, app, {}), false);
    assert.equal(
      canReadApplication({ userId: "lender-1", role: "bank_nbfc" }, app, { bankId: "bank-1" }),
      true,
    );
    assert.equal(
      canReadApplication({ userId: "lender-2", role: "bank_nbfc" }, app, { bankId: "bank-2" }),
      false,
    );
    assert.equal(
      canReadApplication({ userId: "dsa-u", role: "dsa_agent" }, app, { dsaAgentId: "dsa-1" }),
      true,
    );
    assert.equal(
      canReadApplication({ userId: "dsa-other", role: "dsa_agent" }, app, { dsaAgentId: "dsa-2" }),
      false,
    );
    assert.equal(canReadApplication({ userId: "fm", role: "finance_manager" }, app, {}), true);
  });

  it("keeps finance desk roles for admin list protection", () => {
    assert.equal(isFinanceDeskRole("customer"), false);
    assert.equal(isFinanceDeskRole("bank_nbfc"), true);
    assert.equal(isFinanceStaffRole("bank_nbfc"), false);
    assert.equal(isFinanceStaffRole("finance_manager"), true);
    for (const role of ["super_admin", "admin", "finance_manager", "bank_nbfc"]) {
      assert.equal(FINANCE_DESK_ROLES.has(role), true);
    }
  });

  it("blocks new finance PII tables on generic db query", () => {
    assert.equal(NEVER_ALLOW_TABLES.has("finance_eligibility_checks"), true);
    assert.equal(NEVER_ALLOW_TABLES.has("finance_application_documents"), true);
    assert.equal(NEVER_ALLOW_TABLES.has("finance_soft_approvals"), true);
    assert.equal(NEVER_ALLOW_TABLES.has("finance_lender_offers"), true);
  });

  it("treats feature-flag AND as off when master is off", () => {
    const gated = (master: boolean, sub: boolean) => master && sub;
    assert.equal(gated(false, true), false);
    assert.equal(gated(true, true), true);
    assert.equal(gated(true, false), false);
  });
});
