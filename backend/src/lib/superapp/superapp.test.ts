import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { NEVER_ALLOW_TABLES, authorizeLegacyQuery } from "@/lib/db/query-allowlist";
import { SUPERAPP_NEVER_ALLOW_TABLES } from "./constants";
import { generateMotorCartPublicId, looksLikePublicId, publicIdEncodesPii } from "./public-id";
import { normalizeSearchCriteria } from "./search-criteria";
import { applyFileWatermark, sha256Hex } from "./watermark";
import { SuperAppError } from "./errors";

const here = dirname(fileURLToPath(import.meta.url));

describe("Batch 9 super-app unit", () => {
  it("preserves User, Lead, RewardAccount, Notification, ScheduledReminder", () => {
    const schema = readFileSync(join(here, "../../../prisma/schema.prisma"), "utf8");
    assert.match(schema, /model User \{/);
    assert.match(schema, /model Lead \{/);
    assert.match(schema, /model RewardAccount \{/);
    assert.match(schema, /model RewardLedger \{/);
    assert.match(schema, /model Notification \{/);
    assert.match(schema, /model ScheduledReminder \{/);
    assert.match(schema, /model MotorCartIdentity \{/);
    assert.match(schema, /VALUATION_PARTNER/);
    assert.equal(schema.includes("model MergedLead"), false);
    assert.equal(schema.includes("model SecondUser"), false);
  });

  it("blocks super-app tables on /api/db/query", () => {
    for (const table of SUPERAPP_NEVER_ALLOW_TABLES) {
      assert.equal(NEVER_ALLOW_TABLES.has(table), true, table);
      const decision = authorizeLegacyQuery(
        { userId: "u1", role: "super_admin" },
        { table, action: "select" },
        new Set([table]),
      );
      assert.equal(decision.ok, false);
    }
  });

  it("issues MC-XXXXXXXX without PII encoding", () => {
    for (let i = 0; i < 40; i++) {
      const id = generateMotorCartPublicId();
      assert.equal(looksLikePublicId(id), true);
      assert.equal(publicIdEncodesPii(id, "9876543210", "harsh.shah@example.com"), false);
    }
    assert.equal(publicIdEncodesPii("MC-543210ZZ", "9876543210", null), true);
  });

  it("normalizes saved-search filters and rejects invalid PIN", () => {
    const n = normalizeSearchCriteria({ brand: "Hyundai", pincode: "411001", unknown: "x", budgetMin: 100000 });
    assert.equal(n.brand, "Hyundai");
    assert.equal(n.pincode, "411001");
    assert.equal((n as Record<string, unknown>).unknown, undefined);
    assert.throws(() => normalizeSearchCriteria({ pincode: "11" }), (e: SuperAppError) => e.code === "INVALID_PIN");
  });

  it("watermarks JPEG without mutating original buffer", () => {
    const original = Buffer.from([0xff, 0xd8, 0x00, 0x01, 0xff, 0xd9]);
    const copy = Buffer.from(original);
    const processed = applyFileWatermark(original, "image/jpeg");
    assert.equal(original.equals(copy), true);
    assert.notEqual(processed.equals(original), true);
    assert.equal(processed[0], 0xff);
    assert.equal(processed[1], 0xd8);
    assert.equal(sha256Hex(original) !== sha256Hex(processed), true);
  });
});
