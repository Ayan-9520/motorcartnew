/** Catalog import platform types (Phase 3A — foundation only). */

import type { CatalogImportSegment } from "./catalog-segment";
import type { CatalogMatchResult } from "../types";
import type { MediaPipelineReport } from "./media/media-types";

export type ImportSourceType = "csv" | "excel" | "json" | "api" | "scraper" | "oem_feed";

export type ImportPipelineStage =
  | "upload"
  | "validate"
  | "normalize"
  | "duplicate_check"
  | "media"
  | "matching"
  | "approve"
  | "storage"
  | "preview"
  | "publish";

export const IMPORT_PIPELINE_STAGES: readonly ImportPipelineStage[] = [
  "upload",
  "validate",
  "normalize",
  "duplicate_check",
  "media",
  "matching",
  "approve",
  "storage",
  "preview",
  "publish",
] as const;

export type ImportJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type ImportApprovalDecision = "approved" | "rejected" | "pending";

/** Raw catalog row prior to normalization (parser output in future phases). */
export type ImportRecord = {
  rowNumber: number;
  segment: CatalogImportSegment;
  fields: Record<string, string | number | boolean | null>;
  raw?: unknown;
};

export type ImportUploadPayload = {
  sourceType: ImportSourceType;
  fileName?: string;
  byteLength?: number;
  raw: unknown;
  receivedAt: string;
};

export type ImportValidationIssue = {
  code: string;
  message: string;
  rowNumber?: number;
  field?: string;
};

export type ImportValidationReport = {
  valid: boolean;
  recordCount: number;
  issues: ImportValidationIssue[];
};

export type ImportDuplicateGroupSummary = {
  groupId: string;
  signal: string;
  fingerprint: string;
  classification: string;
  rowNumbers: number[];
};

export type ImportMergeRecommendationSummary = {
  kind: string;
  message: string;
  groupId: string;
  rowNumbers: number[];
  signal: string;
  priority: string;
};

export type ImportDuplicateReport = {
  checked: boolean;
  duplicateCount: number;
  possibleDuplicateCount?: number;
  uniqueCount?: number;
  duplicates: Array<{ businessKey: string; rowNumbers: number[] }>;
  groups?: ImportDuplicateGroupSummary[];
  mergeRecommendations?: ImportMergeRecommendationSummary[];
  summary?: Record<string, number | Record<string, number>>;
};

export type ImportPreviewReport = {
  recordCount: number;
  sampleRecords: ImportRecord[];
  summary: Record<string, number | string>;
};

export type ImportApprovalReport = {
  decision: ImportApprovalDecision;
  autoApproved: boolean;
  reason: string;
  approvedCount?: number;
  rejectedCount?: number;
  manualReviewCount?: number;
};

export type ImportStorageManifestEntry = {
  key: string;
  sourceUrl: string;
  rowNumber: number;
  contentType: string;
  dryRun: true;
};

export type ImportStorageReport = {
  dryRun: true;
  provider: string;
  uploadedCount: number;
  failedCount: number;
  manifest: ImportStorageManifestEntry[];
};

export type ImportMatchingReport = {
  checked: boolean;
  resultCount: number;
  exactMatches: number;
  weakMatches: number;
  noMatches: number;
  results: CatalogMatchResult[];
};

export type ImportPublishReport = {
  published: boolean;
  dryRun: true;
  wouldPublishCount: number;
  message: string;
};

export type ImportStageLog = {
  stage: ImportPipelineStage;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  message?: string;
};

export class ImportError extends Error {
  readonly code: string;
  readonly stage?: ImportPipelineStage;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    options?: { stage?: ImportPipelineStage; details?: Record<string, unknown>; cause?: unknown },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "ImportError";
    this.code = code;
    this.stage = options?.stage;
    this.details = options?.details;
  }
}

export type ImportResult<T = unknown> = {
  success: boolean;
  stage: ImportPipelineStage;
  data?: T;
  errors: ImportError[];
  warnings: string[];
  metadata: Record<string, unknown>;
};

export function importSuccess<T>(
  stage: ImportPipelineStage,
  data?: T,
  extras?: { warnings?: string[]; metadata?: Record<string, unknown> },
): ImportResult<T> {
  return {
    success: true,
    stage,
    data,
    errors: [],
    warnings: extras?.warnings ?? [],
    metadata: extras?.metadata ?? {},
  };
}

export function importFailure(
  stage: ImportPipelineStage,
  errors: ImportError[],
  extras?: { warnings?: string[]; metadata?: Record<string, unknown> },
): ImportResult<never> {
  return {
    success: false,
    stage,
    errors,
    warnings: extras?.warnings ?? [],
    metadata: extras?.metadata ?? {},
  };
}

export type ImportJobOptions = {
  sourceType: ImportSourceType;
  fileName?: string;
  initiatedBy?: string;
  dryRun?: boolean;
  metadata?: Record<string, unknown>;
};

export type ImportContextSnapshot = {
  jobId: string;
  sourceType: ImportSourceType;
  currentStage: ImportPipelineStage | null;
  status: ImportJobStatus;
  upload?: ImportUploadPayload;
  records: ImportRecord[];
  normalizedRecords: ImportRecord[];
  validation?: ImportValidationReport;
  duplicates?: ImportDuplicateReport;
  media?: MediaPipelineReport;
  matching?: ImportMatchingReport;
  storage?: ImportStorageReport;
  preview?: ImportPreviewReport;
  approval?: ImportApprovalReport;
  publish?: ImportPublishReport;
  stageLogs: ImportStageLog[];
  errors: ImportError[];
  warnings: string[];
};

export type ImportPipelineConfig = {
  /** Stop pipeline on first stage failure. Default: true */
  stopOnError: boolean;
  /** When true, publish stage performs dry-run only (Phase 3A default). */
  dryRun: boolean;
  /** Minimum valid records required to reach approve stage. Default: 0 */
  minRecordsForApproval: number;
};

export const DEFAULT_IMPORT_PIPELINE_CONFIG: ImportPipelineConfig = {
  stopOnError: true,
  dryRun: true,
  minRecordsForApproval: 0,
};
