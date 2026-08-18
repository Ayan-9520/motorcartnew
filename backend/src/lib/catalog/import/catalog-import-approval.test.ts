import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateImportApprovalGate } from "./catalog-import-approval.policy";
import {
  applyCatalogImportApprovalBatch,
  mergeApprovalIntoPreview,
} from "./catalog-import-approval.service";
import type { CatalogImportPreviewPayload, CatalogImportPreviewRecord } from "./catalog-import-preview.types";
import type { CatalogImportApprovalDecision } from "./catalog-import-approval.types";

function record(partial: Partial<CatalogImportPreviewRecord> & Pick<CatalogImportPreviewRecord, "id" | "rowNumber">): CatalogImportPreviewRecord {
  return {
    status: "valid",
    imageUrl: null,
    brand: "Hyundai",
    model: "Creta",
    variant: "SX",
    fuel: "Petrol",
    transmission: "Manual",
    price: "1000000",
    city: "Delhi",
    matchConfidence: 100,
    matchMethod: "exact",
    duplicateReason: null,
    validationErrors: [],
    ...partial,
  };
}

function preview(records: CatalogImportPreviewRecord[]): CatalogImportPreviewPayload {
  return {
    dryRun: true,
    published: false,
    jobId: "catalog-import-approval-test",
    generatedAt: new Date().toISOString(),
    summary: {
      totalRecords: records.length,
      valid: records.filter((r) => r.status === "valid").length,
      duplicate: records.filter((r) => r.status === "duplicate").length,
      needReview: records.filter((r) => r.status === "need_review").length,
      rejected: records.filter((r) => r.status === "rejected").length,
    },
    records,
  };
}

describe("evaluateImportApprovalGate (Phase 2D rules)", () => {
  it("allows approve for high-confidence valid rows", () => {
    const gate = evaluateImportApprovalGate(record({ id: "r1", rowNumber: 1, matchConfidence: 100 }), {
      actorRole: "admin",
    });
    assert.equal(gate.canApprove, true);
    assert.equal(gate.ruleState, "AUTO_APPROVED");
  });

  it("keeps low-confidence rows pending (cannot approve)", () => {
    const gate = evaluateImportApprovalGate(
      record({ id: "r2", rowNumber: 2, matchConfidence: 60, matchMethod: "fuzzy", status: "need_review" }),
      { actorRole: "admin" },
    );
    assert.equal(gate.canApprove, false);
    assert.equal(gate.requiresPending, true);
  });

  it("blocks invalid/duplicate unless super_admin override", () => {
    const invalid = evaluateImportApprovalGate(
      record({ id: "r3", rowNumber: 3, status: "rejected", validationErrors: ["fuel: bad"] }),
      { actorRole: "admin" },
    );
    assert.equal(invalid.canApprove, false);

    const overridden = evaluateImportApprovalGate(
      record({ id: "r3", rowNumber: 3, status: "rejected", validationErrors: ["fuel: bad"] }),
      { actorRole: "super_admin", override: true },
    );
    assert.equal(overridden.canApprove, true);

    const dup = evaluateImportApprovalGate(
      record({ id: "r4", rowNumber: 4, status: "duplicate", duplicateReason: "duplicate: business_key" }),
      { actorRole: "admin", override: true },
    );
    assert.equal(dup.canApprove, false);
  });
});

describe("applyCatalogImportApprovalBatch", () => {
  it("approves and rejects with audit events", () => {
    const decisions = new Map<string, CatalogImportApprovalDecision>();
    const audit: unknown[] = [];
    const payload = preview([
      record({ id: "a", rowNumber: 1, matchConfidence: 100 }),
      record({ id: "b", rowNumber: 2, matchConfidence: 100 }),
    ]);

    const approved = applyCatalogImportApprovalBatch({
      jobId: payload.jobId,
      action: "approve",
      request: { recordIds: ["a"] },
      actorUserId: "admin-1",
      actorRole: "admin",
      preview: payload,
      existingDecisions: decisions,
      appendAudit: (e) => audit.push(e),
    });

    assert.equal(approved.applied, 1);
    assert.equal(decisions.get("a")?.status, "APPROVED");
    assert.equal(decisions.get("a")?.published, false);

    const rejected = applyCatalogImportApprovalBatch({
      jobId: payload.jobId,
      action: "reject",
      request: { recordIds: ["b"], reason: "Wrong variant" },
      actorUserId: "admin-1",
      actorRole: "admin",
      preview: payload,
      existingDecisions: decisions,
      appendAudit: (e) => audit.push(e),
    });

    assert.equal(rejected.applied, 1);
    assert.equal(decisions.get("b")?.status, "REJECTED");
    assert.equal(decisions.get("b")?.reason, "Wrong variant");
    assert.equal(audit.length, 2);
  });

  it("blocks approve for low confidence and records audit", () => {
    const decisions = new Map<string, CatalogImportApprovalDecision>();
    const audit: Array<{ outcome: string }> = [];
    const payload = preview([
      record({ id: "low", rowNumber: 1, matchConfidence: 60, matchMethod: "fuzzy", status: "need_review" }),
    ]);

    const result = applyCatalogImportApprovalBatch({
      jobId: payload.jobId,
      action: "approve",
      request: { recordIds: ["low"] },
      actorUserId: "admin-1",
      actorRole: "admin",
      preview: payload,
      existingDecisions: decisions,
      appendAudit: (e) => audit.push(e),
    });

    assert.equal(result.blocked, 1);
    assert.equal(decisions.size, 0);
    assert.equal(audit[0]?.outcome, "blocked");
  });

  it("merges approval overlay into preview", () => {
    const decisions = new Map<string, CatalogImportApprovalDecision>();
    decisions.set("a", {
      recordId: "a",
      jobId: "job",
      status: "APPROVED",
      actorUserId: "u1",
      actorRole: "admin",
      decidedAt: new Date().toISOString(),
      reason: null,
      override: false,
      published: false,
    });

    const merged = mergeApprovalIntoPreview(
      preview([record({ id: "a", rowNumber: 1 }), record({ id: "b", rowNumber: 2 })]),
      decisions,
    );

    assert.equal(merged.records[0]?.approvalStatus, "APPROVED");
    assert.equal(merged.records[1]?.approvalStatus, "PENDING_REVIEW");
    assert.equal(merged.summary.approved, 1);
    assert.equal(merged.summary.pendingReview, 1);
    assert.equal(merged.published, false);
  });
});
