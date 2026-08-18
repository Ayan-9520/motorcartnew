import { randomUUID } from "node:crypto";
import {
  defaultApprovalStatus,
  evaluateImportApprovalGate,
} from "./catalog-import-approval.policy";
import type {
  CatalogImportApprovalAction,
  CatalogImportApprovalAuditEvent,
  CatalogImportApprovalBatchResult,
  CatalogImportApprovalDecision,
  CatalogImportApprovalItemResult,
  CatalogImportApprovalRequest,
  CatalogImportApprovalStatus,
} from "./catalog-import-approval.types";
import type { CatalogImportPreviewPayload, CatalogImportPreviewRecord } from "./catalog-import-preview.types";

export type ApplyImportApprovalOptions = {
  jobId: string;
  action: CatalogImportApprovalAction;
  request: CatalogImportApprovalRequest;
  actorUserId: string;
  actorRole: string;
  preview: CatalogImportPreviewPayload;
  existingDecisions: Map<string, CatalogImportApprovalDecision>;
  appendAudit: (event: CatalogImportApprovalAuditEvent) => void;
};

export function applyCatalogImportApprovalBatch(
  options: ApplyImportApprovalOptions,
): CatalogImportApprovalBatchResult {
  const { action, request, actorUserId, actorRole, preview, jobId } = options;
  const results: CatalogImportApprovalItemResult[] = [];
  let applied = 0;
  let blocked = 0;

  const byId = new Map(preview.records.map((record) => [record.id, record]));

  for (const recordId of request.recordIds) {
    const record = byId.get(recordId);
    if (!record) {
      blocked += 1;
      results.push({
        recordId,
        success: false,
        status: options.existingDecisions.get(recordId)?.status ?? "PENDING_REVIEW",
        message: "Record not found in import preview",
      });
      continue;
    }

    const previousStatus =
      options.existingDecisions.get(recordId)?.status ?? defaultApprovalStatus();
    const gate = evaluateImportApprovalGate(record, {
      actorRole,
      override: request.override === true,
    });

    if (action === "approve") {
      if (!gate.canApprove) {
        blocked += 1;
        const message = gate.blockReason ?? "Approve blocked by policy";
        options.appendAudit({
          id: randomUUID(),
          jobId,
          recordId,
          action,
          previousStatus,
          nextStatus: previousStatus,
          actorUserId,
          actorRole,
          reason: request.reason ?? null,
          override: request.override === true,
          at: new Date().toISOString(),
          outcome: "blocked",
          blockReason: message,
        });
        results.push({
          recordId,
          success: false,
          status: previousStatus,
          message,
        });
        continue;
      }

      const decision: CatalogImportApprovalDecision = {
        recordId,
        jobId,
        status: "APPROVED",
        actorUserId,
        actorRole,
        decidedAt: new Date().toISOString(),
        reason: request.reason ?? null,
        override: request.override === true,
        published: false,
      };
      options.existingDecisions.set(recordId, decision);
      applied += 1;
      options.appendAudit({
        id: randomUUID(),
        jobId,
        recordId,
        action,
        previousStatus,
        nextStatus: "APPROVED",
        actorUserId,
        actorRole,
        reason: decision.reason,
        override: decision.override,
        at: decision.decidedAt,
        outcome: "applied",
      });
      results.push({
        recordId,
        success: true,
        status: "APPROVED",
        message: "Approved (dry-run — not published)",
      });
      continue;
    }

    // reject
    if (!gate.canReject) {
      blocked += 1;
      results.push({
        recordId,
        success: false,
        status: previousStatus,
        message: "Reject not allowed",
      });
      continue;
    }

    const reason = request.reason?.trim() || "Rejected by admin";
    const decision: CatalogImportApprovalDecision = {
      recordId,
      jobId,
      status: "REJECTED",
      actorUserId,
      actorRole,
      decidedAt: new Date().toISOString(),
      reason,
      override: false,
      published: false,
    };
    options.existingDecisions.set(recordId, decision);
    applied += 1;
    options.appendAudit({
      id: randomUUID(),
      jobId,
      recordId,
      action,
      previousStatus,
      nextStatus: "REJECTED",
      actorUserId,
      actorRole,
      reason,
      override: false,
      at: decision.decidedAt,
      outcome: "applied",
    });
    results.push({
      recordId,
      success: true,
      status: "REJECTED",
      message: "Rejected (dry-run — not published)",
    });
  }

  return {
    jobId,
    action,
    dryRun: true,
    published: false,
    requested: request.recordIds.length,
    applied,
    blocked,
    results,
  };
}

export function mergeApprovalIntoPreview(
  preview: CatalogImportPreviewPayload,
  decisions: Map<string, CatalogImportApprovalDecision>,
  actorRole = "admin",
): CatalogImportPreviewPayload {
  const records: CatalogImportPreviewRecord[] = preview.records.map((record) => {
    const decision = decisions.get(record.id) ?? null;
    const gate = evaluateImportApprovalGate(record, { actorRole });
    const approvalStatus: CatalogImportApprovalStatus = decision?.status ?? "PENDING_REVIEW";
    return {
      ...record,
      approvalStatus,
      approvalDecision: decision,
      ruleState: gate.ruleState,
      ruleReason: gate.ruleReason,
      canApprove: approvalStatus === "PENDING_REVIEW" && gate.canApprove,
      canReject: approvalStatus === "PENDING_REVIEW" && gate.canReject,
      approveBlockReason: gate.blockReason,
    };
  });

  return {
    ...preview,
    published: false,
    dryRun: true,
    records,
    summary: {
      ...preview.summary,
      pendingReview: records.filter((r) => r.approvalStatus === "PENDING_REVIEW").length,
      approved: records.filter((r) => r.approvalStatus === "APPROVED").length,
      approvalRejected: records.filter((r) => r.approvalStatus === "REJECTED").length,
    },
  };
}
