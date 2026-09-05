import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { NEVER_ALLOW_TABLES, authorizeLegacyQuery } from "@/lib/db/query-allowlist";
import { boundPage, sanitizeSearchQuery } from "@/lib/http/request-meta";
import { featureFlags } from "@/config/feature-flags";
import { rejectClientPaidStatus } from "@/services/commercial-billing.service";
import { ManualPaymentProvider } from "@/lib/commercial/payment-provider";
import { isPaymentGatewayEnabled } from "@/lib/commercial/flags";
import { hmacHex, hmacValid } from "@/lib/commos/crypto";
import { CommercialError } from "@/lib/commercial/errors";
import { categoryFilterTypes } from "@/lib/unified-search/categories";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");

describe("Batch 12 launch readiness unit", () => {
  it("keeps one canonical User, Dealer, Organization, Lead, Community, CRM, billing, rewards, notifications, comms, MotorCart One", () => {
    const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
    assert.match(schema, /model User \{/);
    assert.match(schema, /model Dealer \{/);
    assert.match(schema, /model Organization \{/);
    assert.match(schema, /model Lead \{/);
    assert.match(schema, /model CommunityUserProfile \{/);
    assert.match(schema, /model Opportunity \{/);
    assert.match(schema, /model CommercialPayment \{/);
    assert.match(schema, /model RewardLedger \{/);
    assert.match(schema, /model Notification \{/);
    assert.match(schema, /model CommunicationProvider \{/);
    assert.match(schema, /model MotorCartIdentity \{/);
    assert.match(schema, /model FinanceProduct \{/);
    assert.match(schema, /model InsurancePartner \{/);
    assert.match(schema, /model PartProduct \{/);
    assert.match(schema, /model JobPosting \{/);
    assert.equal(schema.includes("model MergedLead"), false);
    assert.equal(schema.includes("model SecondOrganization"), false);
    assert.equal(schema.includes("model OpenSearchIndex"), false);
  });

  it("sanitizes search queries and bounds pagination", () => {
    assert.equal(sanitizeSearchQuery(""), "");
    assert.equal(sanitizeSearchQuery("%"), "");
    assert.equal(sanitizeSearchQuery("honda"), "honda");
    assert.ok(sanitizeSearchQuery("a".repeat(200)).length <= 80);
    const page = boundPage(999, -4, 40);
    assert.equal(page.limit, 40);
    assert.equal(page.offset, 0);
  });

  it("maps type aliases without treating catalog as inventory category", () => {
    assert.deepEqual(categoryFilterTypes("vehicles")?.includes("new_car_stock"), true);
    assert.ok(categoryFilterTypes("parts")?.includes("part"));
    assert.ok(categoryFilterTypes("jobs")?.includes("job"));
    assert.ok(categoryFilterTypes("finance")?.includes("finance_product"));
    assert.equal(categoryFilterTypes("growth"), null);
  });

  it("blocks private tables on /api/db/query (NEVER_ALLOW)", () => {
    const privateTables = [
      "quotations",
      "test_drive_bookings",
      "reward_ledger",
      "commercial_payments",
      "motorcart_identities",
      "communication_messages",
      "job_applications",
      "part_orders",
      "insurance_policies",
      "finance_application_documents",
      "otp_codes",
      "refresh_tokens",
    ];
    for (const table of privateTables) {
      assert.equal(NEVER_ALLOW_TABLES.has(table), true, table);
      const decision = authorizeLegacyQuery(
        { userId: "u1", role: "super_admin" },
        { table, action: "select" },
        new Set([table]),
      );
      assert.equal(decision.ok, false, table);
    }
  });

  it("does not enable payment gateway by default; manual adapter cannot confirm paid", async () => {
    assert.equal(featureFlags.paymentGateway, false);
    assert.equal(isPaymentGatewayEnabled(), false);
    await assert.rejects(() => rejectClientPaidStatus("PAID"), (e: CommercialError) => e.code === "FORGED_PAYMENT_STATUS");
    const manual = new ManualPaymentProvider();
    const verified = await manual.verifyPayment();
    assert.equal(verified.paid, false);
  });

  it("verifies webhook HMAC without accepting unsigned payloads", () => {
    const secret = "unit-whsec";
    const body = JSON.stringify({ event: "delivered" });
    assert.equal(hmacValid(secret, body, "00"), false);
    const sig = hmacHex(secret, body);
    assert.equal(hmacValid(secret, body, sig), true);
  });

  it("search and notifications flags default on; provider-dependent flags stay off", () => {
    assert.equal(featureFlags.unifiedSearch, true);
    assert.equal(featureFlags.unifiedNotifications, true);
    assert.equal(featureFlags.dialer, false);
    assert.equal(featureFlags.aiCalling, false);
    assert.equal(featureFlags.leadBoard, false);
  });

  it("does not ship live credentials in env examples", () => {
    const be = readFileSync(join(root, ".env.example"), "utf8");
    const fe = readFileSync(join(root, "../frontend/.env.example"), "utf8");
    assert.equal(/sk-live|rk_live|whsec_live/.test(be), false);
    assert.equal(/OPENAI_API_KEY=sk-/.test(be), false);
    assert.equal(/VITE_JWT|VITE_DATABASE|VITE_OPENAI/.test(fe), false);
    assert.match(be, /FEATURE_PAYMENT_GATEWAY=false/);
  });

  it("founder fallback and mock overview files stay classified, not wired as production KPIs", () => {
    const founder = readFileSync(join(root, "../frontend/src/features/founder-dashboard/pages/FounderDashboardPage.tsx"), "utf8");
    assert.match(founder, /users:\s*0/);
    const overviewSvc = readFileSync(
      join(root, "../frontend/src/features/platform-admin/services/platform-admin.service.ts"),
      "utf8",
    );
    assert.equal(overviewSvc.includes("MOCK_OVERVIEW.mrrEstimate"), false);
    assert.match(overviewSvc, /mrrEstimate:\s*0/);
  });
});
