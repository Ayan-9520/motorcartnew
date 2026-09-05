import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { NEVER_ALLOW_TABLES, authorizeLegacyQuery } from "@/lib/db/query-allowlist";
import { PHASE_LOCKED_FEATURES, resolveFeatureEntitlement } from "@/lib/organization/entitlements";
import { SALES_NEVER_ALLOW_TABLES } from "./constants";
import { calculateLeadQuality, extractIndiaPin } from "./quality";
import { maskName, maskPhone } from "./pii";
import { isAiCallingEnabled, isDialerEnabled } from "./flags";
import { SalesOsError } from "./errors";

const here = dirname(fileURLToPath(import.meta.url));

describe("Batch 7 sales OS unit", () => {
  it("canonical Lead remains a distinct table from dealer/broker/finance leads", () => {
    const schema = readFileSync(join(here, "../../../prisma/schema.prisma"), "utf8");
    assert.match(schema, /model Lead \{/);
    assert.match(schema, /model DealerLead \{/);
    assert.match(schema, /model BrokerLead \{/);
    assert.match(schema, /model FinanceLead \{/);
    assert.match(schema, /@@map\("leads"\)/);
    assert.match(schema, /@@map\("dealer_leads"\)/);
    assert.equal(schema.includes("model MergedLead"), false);
  });

  it("calculates HOT/WARM/COLD/UNQUALIFIED without claiming AI", () => {
    const hot = calculateLeadQuality({
      hasVerifiedContact: true,
      hasVehicle: true,
      hasBudget: true,
      hasTimeline: true,
      financeRequired: true,
      exchangeRequired: true,
      hasValidPin: true,
      repeatedEnquiry: true,
      quotationExists: true,
      testDriveExists: true,
    });
    assert.equal(hot.quality, "HOT");
    assert.ok(hot.score >= 70);
    const cold = calculateLeadQuality({
      hasVerifiedContact: true,
      hasVehicle: false,
      hasBudget: false,
      hasTimeline: false,
      financeRequired: false,
      exchangeRequired: false,
      hasValidPin: false,
      repeatedEnquiry: false,
      quotationExists: false,
      testDriveExists: false,
    });
    assert.equal(cold.quality, "COLD");
    const none = calculateLeadQuality({
      hasVerifiedContact: false,
      hasVehicle: false,
      hasBudget: false,
      hasTimeline: false,
      financeRequired: false,
      exchangeRequired: false,
      hasValidPin: false,
      repeatedEnquiry: false,
      quotationExists: false,
      testDriveExists: false,
    });
    assert.equal(none.quality, "UNQUALIFIED");
  });

  it("extracts exact India PIN and masks PII", () => {
    assert.equal(extractIndiaPin("411001"), "411001");
    assert.equal(extractIndiaPin("Pune 411001 MH"), "411001");
    assert.equal(extractIndiaPin("12"), null);
    assert.equal(maskName("Harsh Shah"), "H**** S***");
    assert.equal(maskPhone("9876543210"), "******3210");
  });

  it("blocks sales OS tables on /api/db/query", () => {
    for (const table of SALES_NEVER_ALLOW_TABLES) {
      assert.equal(NEVER_ALLOW_TABLES.has(table), true, table);
      const decision = authorizeLegacyQuery(
        { userId: "u1", role: "super_admin" },
        { table, action: "select" },
        new Set([table]),
      );
      assert.equal(decision.ok, false);
    }
  });

  it("keeps dialer and AI calling locked; lead_board is not plan-unlocked", () => {
    assert.equal(isDialerEnabled(), false);
    assert.equal(isAiCallingEnabled(), false);
    assert.equal(PHASE_LOCKED_FEATURES.has("dialer"), true);
    assert.equal(PHASE_LOCKED_FEATURES.has("ai_calling"), true);
    assert.equal(resolveFeatureEntitlement("enterprise", "lead_board"), false);
    assert.equal(resolveFeatureEntitlement("enterprise", "paid_leads"), false);
    assert.equal(resolveFeatureEntitlement("enterprise", "dialer"), false);
  });

  it("SalesOsError carries HTTP status", () => {
    const e = new SalesOsError("Insufficient credits", 402, "INSUFFICIENT_CREDITS");
    assert.equal(e.status, 402);
  });

  it("does not use mock CRM/board records in sales services", () => {
    const crm = readFileSync(join(here, "../../services/sales-crm.service.ts"), "utf8");
    const board = readFileSync(join(here, "../../services/sales-board.service.ts"), "utf8");
    assert.equal(crm.includes("MOCK_"), false);
    assert.equal(board.includes("MOCK_"), false);
    assert.equal(board.includes("fake monthly"), false);
  });
});
