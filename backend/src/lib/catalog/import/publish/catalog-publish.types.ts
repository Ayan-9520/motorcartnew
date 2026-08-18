/** Catalog import publish engine types (Phase 5E). */

export const CATALOG_PUBLISH_RECORD_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "REJECTED",
  "FAILED",
  "SKIPPED_DUPLICATE",
] as const;

export type CatalogPublishRecordStatus = (typeof CATALOG_PUBLISH_RECORD_STATUSES)[number];

export type CatalogPublishAuditEvent = {
  id: string;
  jobId: string;
  source: string;
  externalId: string | null;
  recordId: string;
  publishedRecordId: string | null;
  actorUserId: string;
  timestamp: string;
  action: "publish" | "skip" | "fail";
  success: boolean;
  errorReason: string | null;
};

export type CatalogPublishRecordResult = {
  recordId: string;
  rowNumber: number;
  status: CatalogPublishRecordStatus;
  businessKey: string | null;
  catalogVariantId: string | null;
  externalId: string | null;
  message: string;
  mediaUploaded: boolean;
};

export type CatalogPublishSummary = {
  requested: number;
  published: number;
  failed: number;
  skippedDuplicate: number;
  skippedNotApproved: number;
  mediaFailure: number;
  validationFailure: number;
};

export type CatalogPublishReport = {
  jobId: string;
  dryRun: false;
  published: true;
  startedAt: string;
  finishedAt: string;
  actorUserId: string;
  summary: CatalogPublishSummary;
  results: CatalogPublishRecordResult[];
  audit: CatalogPublishAuditEvent[];
};

export type CatalogPublishRequest = {
  confirm: true;
  /** Optional subset; default = all APPROVED decisions. */
  recordIds?: string[];
};

export type CatalogPublishEngineOptions = {
  jobId: string;
  sourceCode: string;
  actorUserId: string;
  actorRole: string;
  confirm: true;
  recordIds?: string[];
  /** Allow mock storage in tests only. Production requires R2/S3 env. */
  allowMockStorage?: boolean;
};
