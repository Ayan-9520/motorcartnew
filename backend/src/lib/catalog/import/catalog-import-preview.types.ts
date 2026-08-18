/** Read-only catalog import preview projection (Phase 5C + 5D approval overlay). */

import type { CatalogImportApprovalDecision, CatalogImportApprovalStatus } from "./catalog-import-approval.types";

export const CATALOG_IMPORT_PREVIEW_STATUSES = [
  "valid",
  "duplicate",
  "need_review",
  "rejected",
] as const;

export type CatalogImportPreviewStatus = (typeof CATALOG_IMPORT_PREVIEW_STATUSES)[number];

export type CatalogImportPreviewRecord = {
  id: string;
  rowNumber: number;
  status: CatalogImportPreviewStatus;
  imageUrl: string | null;
  brand: string;
  model: string;
  variant: string;
  fuel: string;
  transmission: string;
  price: string | null;
  city: string;
  matchConfidence: number | null;
  matchMethod: string | null;
  duplicateReason: string | null;
  validationErrors: string[];
  /** Phase 5D — workflow status (defaults PENDING_REVIEW). */
  approvalStatus?: CatalogImportApprovalStatus;
  approvalDecision?: CatalogImportApprovalDecision | null;
  ruleState?: "AUTO_APPROVED" | "MANUAL_REVIEW" | "REJECTED";
  ruleReason?: string;
  canApprove?: boolean;
  canReject?: boolean;
  approveBlockReason?: string | null;
};

export type CatalogImportPreviewSummary = {
  totalRecords: number;
  valid: number;
  duplicate: number;
  needReview: number;
  rejected: number;
  pendingReview?: number;
  approved?: number;
  approvalRejected?: number;
};

export type CatalogImportPreviewPayload = {
  dryRun: true;
  published: false;
  jobId: string;
  generatedAt: string;
  summary: CatalogImportPreviewSummary;
  records: CatalogImportPreviewRecord[];
};
