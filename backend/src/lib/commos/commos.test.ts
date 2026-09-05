import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { NEVER_ALLOW_TABLES, authorizeLegacyQuery } from "@/lib/db/query-allowlist";
import { PHASE_LOCKED_FEATURES, resolveFeatureEntitlement } from "@/lib/organization/entitlements";
import { COMMOS_NEVER_ALLOW_TABLES, BLOCKED_TOOLS } from "./constants";
import { hmacHex, hmacValid, detectLanguage, maskRecipient } from "./crypto";
import { inQuietHours } from "./policy";
import { parseBudgetInr, scoreDeal } from "./scoring";
import { assertToolAllowed } from "./tools";
import { CommosError } from "./errors";
import { isAiCallingEnabled, isDialerEnabled } from "@/lib/sales-os/flags";

const here = dirname(fileURLToPath(import.meta.url));

describe("Batch 10 communication + AI OS unit", () => {
  it("reuses Lead/Organization/consent and keeps WhatsApp distinct from telephony", () => {
    const schema = readFileSync(join(here, "../../../prisma/schema.prisma"), "utf8");
    assert.match(schema, /model Lead \{/);
    assert.match(schema, /model Organization \{/);
    assert.match(schema, /model CustomerConsent \{/);
    assert.match(schema, /model CommunicationProvider \{/);
    assert.match(schema, /model CallSession \{/);
    assert.match(schema, /model AiConversation \{/);
    assert.match(schema, /channel\s+String/);
    assert.equal(schema.includes("model MergedLead"), false);
    const flags = readFileSync(join(here, "../sales-os/flags.ts"), "utf8");
    assert.match(flags, /FEATURE_DIALER/);
    assert.match(flags, /FEATURE_AI_CALLING/);
  });

  it("blocks commos tables on /api/db/query", () => {
    for (const table of COMMOS_NEVER_ALLOW_TABLES) {
      assert.equal(NEVER_ALLOW_TABLES.has(table), true, table);
      const decision = authorizeLegacyQuery(
        { userId: "u1", role: "super_admin" },
        { table, action: "select" },
        new Set([table]),
      );
      assert.equal(decision.ok, false);
    }
  });

  it("keeps plan math from unlocking dialer/AI calling", () => {
    assert.equal(PHASE_LOCKED_FEATURES.has("dialer"), true);
    assert.equal(PHASE_LOCKED_FEATURES.has("ai_calling"), true);
    assert.equal(resolveFeatureEntitlement("enterprise", "dialer"), false);
    assert.equal(isDialerEnabled(), false);
    assert.equal(isAiCallingEnabled(), false);
  });

  it("validates webhooks with HMAC and detects languages", () => {
    const secret = "whsec_test";
    const body = '{"status":"DELIVERED"}';
    const sig = hmacHex(secret, body);
    assert.equal(hmacValid(secret, body, sig), true);
    assert.equal(hmacValid(secret, body, "00"), false);
    assert.equal(detectLanguage("₹12 lakh ke andar automatic SUV chahiye"), "hi-IN");
    assert.equal(detectLanguage("I need an automatic SUV under 12 lakh"), "en-IN");
    assert.equal(maskRecipient("9876543210").endsWith("3210"), true);
  });

  it("quiet hours wrap midnight and scoring is deterministic", () => {
    assert.equal(inQuietHours(22, 21, 8), true);
    assert.equal(inQuietHours(10, 21, 8), false);
    assert.equal(parseBudgetInr("12 lakh"), 1_200_000);
    const scored = scoreDeal(
      {
        vehicleId: "v",
        title: "Creta",
        brand: "Hyundai",
        model: "Creta",
        price: 1_100_000,
        transmission: "Automatic",
        fuelType: "Petrol",
        city: "Pune",
        dealerId: "d",
        dealerName: "A",
        stockStatus: "available",
        pinMatch: true,
      },
      { budgetMax: 1_200_000, transmission: "automatic" },
    );
    assert.ok(scored.score >= 80);
  });

  it("blocks arbitrary tools and client prompt abuse is a CommosError", () => {
    for (const t of BLOCKED_TOOLS) {
      assert.throws(() => assertToolAllowed(t), (e: CommosError) => e.code === "TOOL_BLOCKED");
    }
    assert.throws(() => assertToolAllowed("db_query"), (e: CommosError) => e.code === "TOOL_BLOCKED");
    const e = new CommosError("Arbitrary system prompt is not allowed", 403, "PROMPT_BLOCKED");
    assert.equal(e.status, 403);
  });
});
