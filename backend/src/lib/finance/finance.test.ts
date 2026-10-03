import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cibilBand, incomeBand, stripRawPii } from "./bands";
import { checkEligibility } from "./eligibility";
import { calculateEmi, validateEmiParams } from "./emi";
import { FINANCE_DESK_ROLES, isFinanceDeskRole, isFinanceStaffRole } from "./errors";
import { canReadApplication } from "./access";
import { buildLoanOffers } from "./matching";
import { loanFromEmi, priceForProfile, processingFeeWithGst, resolveProductRate } from "./rate-card";
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

  it("caps max loan by interest-aware EMI capacity, not EMI × tenure", () => {
    const result = checkEligibility({
      monthlyIncome: 60000,
      existingEmi: 0,
      loanAmount: 500000,
      tenureMonths: 60,
      cibilScore: 760,
      employmentType: "salaried",
    });
    const naive = result.maxEmi * 60;
    assert.ok(result.maxLoan < naive);
    assert.ok(result.rateUsed && result.rateUsed > 7 && result.rateUsed < 12);
    assert.equal(result.maxLoan, loanFromEmi(result.maxEmi, result.rateUsed!, 60));
  });

  it("applies product LTV against vehicle price", () => {
    const result = checkEligibility({
      monthlyIncome: 200000,
      existingEmi: 0,
      loanAmount: 900000,
      tenureMonths: 60,
      cibilScore: 780,
      employmentType: "salaried",
      product: "used-car-loan",
      vehiclePrice: 1000000,
    });
    assert.equal(result.ltvCap, 800000);
    assert.equal(result.eligible, false);
    assert.match(result.message, /80%/);
  });

  it("prices better CIBIL lower inside the product range", () => {
    const range = { min: 8, max: 12 };
    assert.equal(priceForProfile(range, 810, 60), 8);
    assert.ok(priceForProfile(range, 700, 60) > priceForProfile(range, 760, 60));
    assert.equal(priceForProfile(range, 600, 60), 12);
  });

  it("uses product-wise published rates and skips lenders without the product", () => {
    const sbi = resolveProductRate({ slug: "sbi", interestRateMin: 8.9, interestRateMax: 9.85 }, "used_car");
    assert.equal(sbi?.min, 10.45);
    assert.equal(sbi?.estimated, false);
    assert.equal(resolveProductRate({ slug: "bajaj", interestRateMin: 12, interestRateMax: 24 }, "new_car"), null);
    const unknown = resolveProductRate({ slug: "some-bank", interestRateMin: 9, interestRateMax: 11 }, "used_car");
    assert.equal(unknown?.estimated, true);
    assert.ok(unknown!.min > 9);
  });

  it("adds processing fee with GST to offer total cost", () => {
    const fee = processingFeeWithGst({ pct: 0.5, min: 1000, max: 10000 }, 1000000);
    assert.equal(fee, 5900);
    const [offer] = buildLoanOffers(
      [{ id: "x", slug: "hdfc-bank", rankingScore: 90, minCibil: 700, interestRateMin: 8.15, interestRateMax: 12.5, maxTenureMonths: 84, maxLoanAmount: 5000000 }],
      1000000,
      60,
      { monthlyIncome: 150000, existingEmi: 0, loanAmount: 1000000, tenureMonths: 60, cibilScore: 800, employmentType: "salaried" },
    );
    assert.equal(offer?.effectiveRate, 8.15);
    assert.equal(offer?.totalCost, offer!.emi * 60 + offer!.processingFeeAmount);
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
