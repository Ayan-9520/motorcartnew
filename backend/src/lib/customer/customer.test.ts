import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOwnEnquiry, stripClientOwnerFields } from "./enquiries";
import { allowSlidingWindow, slidingWindowReset } from "@/lib/http/sliding-window";
import { NEVER_ALLOW_TABLES, authorizeLegacyQuery } from "@/lib/db/query-allowlist";

describe("customer enquiry ownership", () => {
  it("matches metadata customer_user_id", () => {
    assert.equal(
      isOwnEnquiry("u1", "9876543210", "a@test.com", {
        phone: "9999999999",
        email: "other@test.com",
        metadata: { customer_user_id: "u1" },
      }),
      true,
    );
  });

  it("rejects another customer's metadata owner", () => {
    assert.equal(
      isOwnEnquiry("u1", "9876543210", "a@test.com", {
        phone: "9876543210",
        email: "a@test.com",
        metadata: { customer_user_id: "u2" },
      }),
      false,
    );
  });

  it("matches phone when no owner is stored", () => {
    assert.equal(
      isOwnEnquiry("u1", "9876543210", null, {
        phone: "9876543210",
        email: null,
        metadata: {},
      }),
      true,
    );
  });

  it("strips client-supplied owner fields", () => {
    const cleaned = stripClientOwnerFields({
      customer_user_id: "attacker",
      user_id: "attacker",
      type: "enquiry",
    });
    assert.equal(cleaned.customer_user_id, undefined);
    assert.equal(cleaned.user_id, undefined);
    assert.equal(cleaned.type, "enquiry");
  });
});

describe("sliding window rate limit", () => {
  it("allows then blocks after max", () => {
    slidingWindowReset("t:key");
    assert.equal(allowSlidingWindow("t:key", 2, 60_000, 1), true);
    assert.equal(allowSlidingWindow("t:key", 2, 60_000, 2), true);
    assert.equal(allowSlidingWindow("t:key", 2, 60_000, 3), false);
    slidingWindowReset("t:key");
  });
});

describe("customer PII tables are not exposed via db/query", () => {
  it("forbids customer_vehicles even for admins", () => {
    assert.equal(NEVER_ALLOW_TABLES.has("customer_vehicles"), true);
    const decision = authorizeLegacyQuery(
      { userId: "u1", role: "super_admin" },
      { table: "customer_vehicles", action: "select" },
      new Set(["customer_vehicles"]),
    );
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.status, 403);
  });
});
