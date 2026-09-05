import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { NEVER_ALLOW_TABLES, authorizeLegacyQuery } from "@/lib/db/query-allowlist";
import { COMMERCIAL_NEVER_ALLOW_TABLES } from "./constants";
import { calculateInvoiceTotals } from "./tax";
import { applyAchievementSlab, classifyReconciliation, partnerShareSplit } from "./slabs";
import { CommercialError } from "./errors";
import { rejectClientPaidStatus } from "@/services/commercial-billing.service";
import { isPaymentGatewayEnabled } from "./flags";
import { PHASE_LOCKED_FEATURES } from "@/lib/organization/entitlements";
import { parsePayoutSpreadsheet } from "./csv";
import { ManualPaymentProvider } from "./payment-provider";

const here = dirname(fileURLToPath(import.meta.url));

describe("Batch 8 commercial unit", () => {
  it("preserves Lead, FinanceCommission, LeadCreditLedger, Organization, Dealer", () => {
    const schema = readFileSync(join(here, "../../../prisma/schema.prisma"), "utf8");
    assert.match(schema, /model Lead \{/);
    assert.match(schema, /model FinanceCommission \{/);
    assert.match(schema, /model LeadCreditLedger \{/);
    assert.match(schema, /model Organization \{/);
    assert.match(schema, /model Dealer \{/);
    assert.match(schema, /model RewardAccount \{/);
    assert.match(schema, /model CommercialPayment \{/);
    assert.equal(schema.includes("model MergedLead"), false);
  });

  it("blocks all commercial tables on /api/db/query", () => {
    for (const table of COMMERCIAL_NEVER_ALLOW_TABLES) {
      assert.equal(NEVER_ALLOW_TABLES.has(table), true, table);
      const decision = authorizeLegacyQuery(
        { userId: "u1", role: "super_admin" },
        { table, action: "select" },
        new Set([table]),
      );
      assert.equal(decision.ok, false);
    }
  });

  it("requires configured tax rates and does not guess GST", () => {
    assert.throws(
      () => calculateInvoiceTotals([1000], {}, true),
      (e: CommercialError) => e.code === "TAX_RATE_NOT_CONFIGURED",
    );
    const intra = calculateInvoiceTotals([1000], { cgstPct: 9, sgstPct: 9 }, true);
    assert.equal(intra.cgst, 90);
    assert.equal(intra.sgst, 90);
    assert.equal(intra.igst, 0);
    assert.equal(intra.total, 1180);
    const inter = calculateInvoiceTotals([1000], { igstPct: 18 }, false);
    assert.equal(inter.igst, 180);
  });

  it("applies only configured slabs and partner share percents", () => {
    assert.throws(() => applyAchievementSlab(100, []), (e: CommercialError) => e.code === "NO_SLABS_CONFIGURED");
    const r = applyAchievementSlab(150000, [
      { minInclusive: 0, maxExclusive: 100000, percent: 1.2 },
      { minInclusive: 100000, maxExclusive: null, percent: 1.5 },
    ]);
    assert.equal(r.slab.percent, 1.5);
    assert.throws(() => partnerShareSplit(100, null), (e: CommercialError) => e.code === "SHARE_NOT_CONFIGURED");
    const share = partnerShareSplit(100, 40);
    assert.equal(share.partnerEligible, 40);
    assert.equal(share.motorcartRetained, 60);
    const src = readFileSync(join(here, "slabs.ts"), "utf8");
    assert.equal(/90\s*%|95\s*%|sharePercent\s*=\s*10/.test(src), false);
  });

  it("classifies reconciliation without fabricating MATCHED", () => {
    assert.equal(classifyReconciliation(100, 100).status, "MATCHED");
    assert.equal(classifyReconciliation(100, 40).status, "PARTIAL");
    assert.equal(classifyReconciliation(100, 0).status, "UNMATCHED");
    assert.equal(classifyReconciliation(100, 130).status, "MISMATCH");
  });

  it("blocks forged client payment success", async () => {
    await assert.rejects(() => rejectClientPaidStatus("PAID"), (e: CommercialError) => e.code === "FORGED_PAYMENT_STATUS");
    await assert.rejects(() => rejectClientPaidStatus("SUCCESS"), (e: CommercialError) => e.code === "FORGED_PAYMENT_STATUS");
  });

  it("keeps production payment gateway disabled by default", () => {
    delete process.env.FEATURE_PAYMENT_GATEWAY;
    assert.equal(isPaymentGatewayEnabled(), false);
  });

  it("keeps dialer and ai_calling phase-locked", () => {
    assert.equal(PHASE_LOCKED_FEATURES.has("dialer"), true);
    assert.equal(PHASE_LOCKED_FEATURES.has("ai_calling"), true);
  });

  it("rejects invalid payout spreadsheet rows", () => {
    const parsed = parsePayoutSpreadsheet(
      "period,bank,product,reference,disbursed_amount,payout_rate,gross_payout\n2026-08,HDFC,new_car,R1,100000,1.2,1200\n,,missing,,x,x,-1\n",
    );
    assert.equal(parsed.rows[0]?.errors.length, 0);
    assert.ok((parsed.rows[1]?.errors.length ?? 0) > 0);
  });

  it("requires webhook signature", async () => {
    process.env.COMMERCIAL_WEBHOOK_SECRET = "unit-secret";
    const p = new ManualPaymentProvider();
    await assert.rejects(() => p.processWebhook("{}", null), (e: CommercialError) => e.code === "WEBHOOK_SIGNATURE");
  });
});
