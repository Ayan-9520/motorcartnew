import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NEVER_ALLOW_TABLES, authorizeLegacyQuery } from "@/lib/db/query-allowlist";
import {
  assertTransition,
  canTransition,
  resolveRange,
  stripClientOwnedFields,
} from "./lifecycle";
import { TestDriveError } from "./errors";

describe("test-drive lifecycle", () => {
  it("allows requested to confirmed and forbids completed to requested", () => {
    assert.equal(canTransition("requested", "confirmed"), true);
    assert.equal(canTransition("requested", "rejected"), true);
    assert.equal(canTransition("confirmed", "completed"), true);
    assert.equal(canTransition("confirmed", "no_show"), true);
    assert.equal(canTransition("completed", "requested"), false);
    assert.equal(canTransition("completed", "confirmed"), false);
    assert.equal(canTransition("rejected", "confirmed"), false);
    assert.equal(canTransition("cancelled", "confirmed"), false);
  });

  it("throws INVALID_TRANSITION for illegal moves", () => {
    assert.throws(
      () => assertTransition("completed", "confirmed"),
      (e: unknown) => e instanceof TestDriveError && e.code === "INVALID_TRANSITION" && e.status === 409,
    );
  });
});

describe("test-drive datetime validation", () => {
  it("rejects past requested times", () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    assert.throws(
      () => resolveRange(past, null),
      (e: unknown) => e instanceof TestDriveError && e.code === "TIME_IN_PAST",
    );
  });

  it("rejects end before start", () => {
    const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() - 60 * 1000);
    assert.throws(
      () => resolveRange(start.toISOString(), end.toISOString()),
      (e: unknown) => e instanceof TestDriveError && e.code === "INVALID_TIME_RANGE",
    );
  });

  it("defaults duration to one hour", () => {
    const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const range = resolveRange(start.toISOString(), null);
    assert.equal(range.end.getTime() - range.start.getTime(), 60 * 60 * 1000);
  });
});

describe("server-owned fields", () => {
  it("strips client-supplied owner and status", () => {
    const cleaned = stripClientOwnedFields({
      dealerId: "forged",
      organizationId: "forged-org",
      customerUserId: "forged-user",
      status: "confirmed",
      customerNotes: "please",
    });
    assert.equal(cleaned.dealerId, undefined);
    assert.equal(cleaned.organizationId, undefined);
    assert.equal(cleaned.customerUserId, undefined);
    assert.equal(cleaned.status, undefined);
    assert.equal(cleaned.customerNotes, "please");
  });
});

describe("test drives are not exposed via db/query", () => {
  it("forbids test_drive_bookings even for admins", () => {
    assert.equal(NEVER_ALLOW_TABLES.has("test_drive_bookings"), true);
    const decision = authorizeLegacyQuery(
      { userId: "u1", role: "super_admin" },
      { table: "test_drive_bookings", action: "select" },
      new Set(["test_drive_bookings"]),
    );
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.status, 403);
  });
});
