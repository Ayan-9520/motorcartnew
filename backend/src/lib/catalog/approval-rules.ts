import type { CatalogLinkRow } from "./linking-types";
import type { ApprovalState, CatalogApprovalConfig } from "./approval-types";
import { DEFAULT_APPROVAL_CONFIG } from "./approval-types";

export function resolveApprovalState(
  row: CatalogLinkRow,
  config: CatalogApprovalConfig = DEFAULT_APPROVAL_CONFIG,
): { state: ApprovalState; reason: string } {
  if (config.forceManualReviewOnMultipleMatches && row.matchStatus === "MULTIPLE_MATCHES") {
    return {
      state: "MANUAL_REVIEW",
      reason: "Ambiguous match — multiple catalog variants tied; requires human review",
    };
  }

  if (config.forceRejectOnWeakMatch && (row.matchStatus === "NO_MATCH" || row.matchStatus === "LOW_CONFIDENCE")) {
    return {
      state: "REJECTED",
      reason:
        row.matchStatus === "NO_MATCH"
          ? "No catalog match — rejected pending catalog coverage"
          : "Fuzzy match confidence too low — rejected pending review rules",
    };
  }

  const confidence = row.confidence;

  if (confidence >= config.autoApproveMinConfidence) {
    return {
      state: "AUTO_APPROVED",
      reason: `Confidence ${confidence} meets auto-approve threshold (>= ${config.autoApproveMinConfidence})`,
    };
  }

  if (confidence >= config.manualReviewMinConfidence) {
    return {
      state: "MANUAL_REVIEW",
      reason: `Confidence ${confidence} requires manual review (${config.manualReviewMinConfidence}–${config.autoApproveMinConfidence - 1})`,
    };
  }

  return {
    state: "REJECTED",
    reason: `Confidence ${confidence} below manual review minimum (< ${config.manualReviewMinConfidence})`,
  };
}

export function mergeApprovalConfig(partial?: Partial<CatalogApprovalConfig>): CatalogApprovalConfig {
  return { ...DEFAULT_APPROVAL_CONFIG, ...partial };
}
