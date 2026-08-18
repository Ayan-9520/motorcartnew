/** Catalog import approval workflow types (Phase 5D — dry-run, no publish). */

export const CATALOG_IMPORT_APPROVAL_STATUSES = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;

export type CatalogImportApprovalStatus = (typeof CATALOG_IMPORT_APPROVAL_STATUSES)[number];

export type CatalogImportApprovalAction = "approve" | "reject";

export type CatalogImportApprovalDecision = {
  recordId: string;
  jobId: string;
  status: CatalogImportApprovalStatus;
  actorUserId: string;
  actorRole: string;
  decidedAt: string;
  reason: string | null;
  override: boolean;
  /** Set true after Phase 5E publish succeeds for this record. */
  published: boolean;
};

export type CatalogImportApprovalAuditEvent = {
  id: string;
  jobId: string;
  recordId: string;
  action: CatalogImportApprovalAction;
  previousStatus: CatalogImportApprovalStatus;
  nextStatus: CatalogImportApprovalStatus;
  actorUserId: string;
  actorRole: string;
  reason: string | null;
  override: boolean;
  at: string;
  outcome: "applied" | "blocked";
  blockReason?: string;
};

export type CatalogImportApprovalRequest = {
  recordIds: string[];
  reason?: string;
  /** Super-admin only — allow approving invalid / validation-rejected / duplicate rows. */
  override?: boolean;
};

export type CatalogImportApprovalItemResult = {
  recordId: string;
  success: boolean;
  status: CatalogImportApprovalStatus;
  message: string;
};

export type CatalogImportApprovalBatchResult = {
  jobId: string;
  action: CatalogImportApprovalAction;
  dryRun: true;
  published: false;
  requested: number;
  applied: number;
  blocked: number;
  results: CatalogImportApprovalItemResult[];
};
