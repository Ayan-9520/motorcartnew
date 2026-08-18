import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authorizeLegacyQuery,
  isNamedQueryOperation,
  NEVER_ALLOW_TABLES,
  NAMED_QUERY_OPERATIONS,
  sanitizeQueryError,
} from "./query-allowlist";

const known = new Set(["vehicles", "leads", "users", "refresh_tokens", "dealers", "new_car_inventory"]);

describe("db query allowlist", () => {
  it("rejects unauthenticated write/query that is not public", () => {
    const decision = authorizeLegacyQuery(null, { table: "users", action: "select" }, known);
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.status, 401);
  });

  it("rejects unknown table as unknown operation", () => {
    const decision = authorizeLegacyQuery(
      { userId: "u1", role: "customer" },
      { table: "not_a_real_table", action: "select" },
      known,
    );
    assert.equal(decision.ok, false);
    if (!decision.ok) {
      assert.equal(decision.status, 400);
      assert.equal(decision.message, "Unknown operation");
    }
  });

  it("rejects unknown named operation", () => {
    assert.equal(isNamedQueryOperation("drop_database"), false);
    assert.equal(isNamedQueryOperation("vehicle_detail"), true);
    assert.ok(NAMED_QUERY_OPERATIONS.includes("create_enquiry"));
  });

  it("allows public vehicle select", () => {
    const decision = authorizeLegacyQuery(null, { table: "vehicles", action: "select" }, known);
    assert.equal(decision.ok, true);
  });

  it("allows public lead insert (enquiry)", () => {
    const decision = authorizeLegacyQuery(null, { table: "leads", action: "insert" }, known);
    assert.equal(decision.ok, true);
  });

  it("never allows refresh_tokens", () => {
    assert.equal(NEVER_ALLOW_TABLES.has("refresh_tokens"), true);
    const decision = authorizeLegacyQuery(
      { userId: "u1", role: "super_admin" },
      { table: "refresh_tokens", action: "select" },
      new Set(["refresh_tokens"]),
    );
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.status, 403);
  });

  it("blocks user insert even for authenticated customers", () => {
    const decision = authorizeLegacyQuery(
      { userId: "u1", role: "customer" },
      { table: "users", action: "insert" },
      known,
    );
    assert.equal(decision.ok, false);
  });

  it("sanitizes prisma/sql errors", () => {
    const sanitized = sanitizeQueryError(new Error("Unknown table: secrets"));
    assert.equal(sanitized.message, "Unknown operation");
    assert.equal(sanitizeQueryError(new Error("relation does not exist")).message, "Query failed");
  });
});
