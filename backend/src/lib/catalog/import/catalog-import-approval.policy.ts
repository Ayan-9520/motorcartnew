import { resolveApprovalState, mergeApprovalConfig } from "../approval-rules";
import type { CatalogApprovalConfig } from "../approval-types";
import type { CatalogLinkRow, CatalogLinkStatus } from "../linking-types";
import type { CatalogMatchConfidence, CatalogMatchMethod } from "../types";
import type { CatalogImportPreviewRecord } from "./catalog-import-preview.types";
import type { CatalogImportApprovalStatus } from "./catalog-import-approval.types";

export type CatalogImportApprovalGate = {
  canApprove: boolean;
  canReject: boolean;
  requiresPending: boolean;
  blockReason: string | null;
  ruleState: "AUTO_APPROVED" | "MANUAL_REVIEW" | "REJECTED";
  ruleReason: string;
  matchStatus: CatalogLinkStatus;
};

function toConfidence(value: number | null): CatalogMatchConfidence {
  if (value === null) return 0;
  if (value >= 100) return 100;
  if (value >= 95) return 95;
  if (value >= 80) return 80;
  if (value >= 60) return 60;
  return 0;
}

function toMatchStatus(record: CatalogImportPreviewRecord): CatalogLinkStatus {
  const confidence = record.matchConfidence;
  const method = record.matchMethod;

  if (method === "fuzzy" || (confidence !== null && confidence > 0 && confidence < 80)) {
    return "LOW_CONFIDENCE";
  }
  if (confidence === null) {
    // Matching skipped — no Phase 2D auto path; stay reviewable unless blocked by quality gates.
    return "MATCHED";
  }
  if (confidence <= 0 || method === "none") return "NO_MATCH";
  return "MATCHED";
}

/** Map preview row → CatalogLinkRow shape for Phase 2D `resolveApprovalState`. */
export function previewRecordToLinkRow(record: CatalogImportPreviewRecord): CatalogLinkRow {
  const confidence = toConfidence(record.matchConfidence);
  const matchStatus = toMatchStatus(record);
  return {
    listingId: record.id,
    source: "vehicles",
    brand: record.brand,
    model: record.model,
    variant: record.variant === "—" ? null : record.variant,
    matchStatus,
    confidence: record.matchConfidence === null ? 80 : confidence,
    catalogVariantId: null,
    businessKey: null,
    matchMethod: (record.matchMethod as CatalogMatchMethod | null) ?? null,
    reason: "Import preview row",
  };
}

export function evaluateImportApprovalGate(
  record: CatalogImportPreviewRecord,
  options: {
    actorRole: string;
    override?: boolean;
    config?: Partial<CatalogApprovalConfig>;
  },
): CatalogImportApprovalGate {
  const config = mergeApprovalConfig(options.config);
  const linkRow = previewRecordToLinkRow(record);
  const resolved = resolveApprovalState(linkRow, config);

  const isInvalid =
    record.validationErrors.length > 0 ||
    record.status === "rejected";
  const isDuplicate =
    record.status === "duplicate" ||
    Boolean(record.duplicateReason?.toLowerCase().includes("duplicate"));
  const matchingSkipped = record.matchConfidence === null;

  const isLowConfidenceOrMultiple =
    !matchingSkipped &&
    (resolved.state === "MANUAL_REVIEW" ||
      linkRow.matchStatus === "MULTIPLE_MATCHES" ||
      linkRow.matchStatus === "LOW_CONFIDENCE" ||
      (record.matchConfidence !== null &&
        record.matchConfidence > 0 &&
        record.matchConfidence < config.manualReviewMinConfidence));

  const qualityBlocked = isInvalid || isDuplicate;

  let canApprove = false;
  let blockReason: string | null = null;

  if (qualityBlocked) {
    const allowedOverride = options.override === true && options.actorRole === "super_admin";
    if (allowedOverride) {
      canApprove = true;
      blockReason = null;
    } else {
      canApprove = false;
      blockReason = isInvalid
        ? "Cannot approve invalid / validation-rejected records (super_admin override required)"
        : "Cannot approve confirmed duplicates (super_admin override required)";
    }
  } else if (isLowConfidenceOrMultiple) {
    // Requirement: multiple-match / low-confidence must remain PENDING_REVIEW (no approve).
    canApprove = false;
    blockReason = "Low-confidence or multi-match rows must remain PENDING_REVIEW";
  } else if (matchingSkipped && record.status === "valid") {
    canApprove = true;
  } else if (resolved.state === "AUTO_APPROVED") {
    canApprove = true;
  } else if (
    record.status === "valid" &&
    record.matchConfidence !== null &&
    record.matchConfidence >= config.autoApproveMinConfidence
  ) {
    canApprove = true;
  } else {
    canApprove = false;
    blockReason = resolved.reason;
  }

  return {
    canApprove,
    canReject: true,
    requiresPending: isLowConfidenceOrMultiple,
    blockReason,
    ruleState: resolved.state,
    ruleReason: resolved.reason,
    matchStatus: linkRow.matchStatus,
  };
}

export function defaultApprovalStatus(): CatalogImportApprovalStatus {
  return "PENDING_REVIEW";
}
