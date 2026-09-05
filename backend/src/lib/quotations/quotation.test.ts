import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateQuotationTotals,
  generateQuotationNumber,
  isExpired,
  money,
  PRICING_FORMULA,
} from "./pricing";
import { stripClientOwnedFields } from "./serialize";
import { NEVER_ALLOW_TABLES, authorizeLegacyQuery } from "@/lib/db/query-allowlist";

describe("quotation pricing", () => {
  it("calculates payable total without using client total", () => {
    const priced = calculateQuotationTotals({
      exShowroomAmount: 1_000_000,
      rtoAmount: 80_000,
      insuranceAmount: 40_000,
      accessoriesAmount: 15_000,
      financeAmount: 800_000,
      exchangeAmount: 50_000,
      otherCharges: 5_000,
      discountAmount: 20_000,
      taxAmount: 10_000,
    });
    assert.equal(priced.totalAmount, 1_000_000 + 80_000 + 40_000 + 15_000 + 5_000 + 10_000 - 20_000 - 50_000);
    assert.equal(priced.financeAmount, 800_000);
    assert.ok(PRICING_FORMULA.includes("exShowroom"));
  });

  it("never goes negative", () => {
    const priced = calculateQuotationTotals({
      exShowroomAmount: 100,
      discountAmount: 500,
      exchangeAmount: 500,
    });
    assert.equal(priced.totalAmount, 0);
  });

  it("rounds money to paise", () => {
    assert.equal(money(10.129), 10.13);
    assert.equal(money(-5), 0);
    assert.equal(money("abc"), 0);
  });
});

describe("quotation number and expiry", () => {
  it("generates a MotorCart quotation number", () => {
    const n = generateQuotationNumber(new Date("2026-08-18T00:00:00Z"));
    assert.match(n, /^MCQ-20260818-[A-Z0-9]+$/);
  });

  it("marks issued quotes expired after validityEnd", () => {
    assert.equal(isExpired("issued", new Date("2020-01-01"), new Date("2026-08-18")), true);
    assert.equal(isExpired("draft", new Date("2020-01-01"), new Date("2026-08-18")), false);
    assert.equal(isExpired("issued", new Date("2027-01-01"), new Date("2026-08-18")), false);
  });
});

describe("server-owned fields", () => {
  it("strips client-supplied owner, total, and quote number", () => {
    const cleaned = stripClientOwnedFields({
      dealerId: "forged",
      organizationId: "forged-org",
      customerUserId: "forged-user",
      quotationNumber: "FAKE-1",
      totalAmount: 1,
      status: "issued",
      exShowroomAmount: 100,
    });
    assert.equal(cleaned.dealerId, undefined);
    assert.equal(cleaned.organizationId, undefined);
    assert.equal(cleaned.customerUserId, undefined);
    assert.equal(cleaned.quotationNumber, undefined);
    assert.equal(cleaned.totalAmount, undefined);
    assert.equal(cleaned.status, undefined);
    assert.equal(cleaned.exShowroomAmount, 100);
  });
});

describe("quotations are not exposed via db/query", () => {
  it("forbids quotations even for admins", () => {
    assert.equal(NEVER_ALLOW_TABLES.has("quotations"), true);
    const decision = authorizeLegacyQuery(
      { userId: "u1", role: "super_admin" },
      { table: "quotations", action: "select" },
      new Set(["quotations"]),
    );
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.status, 403);
  });
});
