import { api } from "@/lib/api/axios";
import { apiErrorMessage } from "@/lib/api/axios";
import { isAxiosError } from "axios";
import {
  CATALOG_IMPORT_ACTIVE_SOURCES,
  CATALOG_IMPORT_SOURCES,
  formatCatalogImportDuration,
  isCatalogImportJobActive,
  statusTotalDurationMs,
  type CatalogImportJobProgress,
  type CatalogImportJobStatus,
  type CatalogImportJobStatusResponse,
  type CatalogImportSourceUi,
} from "./catalog-import.helpers";

export {
  CATALOG_IMPORT_ACTIVE_SOURCES,
  CATALOG_IMPORT_SOURCES,
  formatCatalogImportDuration,
  isCatalogImportJobActive,
  statusTotalDurationMs,
  type CatalogImportJobProgress,
  type CatalogImportJobStatus,
  type CatalogImportJobStatusResponse,
  type CatalogImportSourceUi,
};

export type CatalogImportStartBody = {
  source: "gaadi_bazaar";
  city?: string;
  search?: string;
  pages?: number;
  segment?: string;
};

export type CatalogImportStartResponse = {
  jobId: string;
  status: "started";
};

export type CatalogImportStageTiming = {
  stage: string;
  label: string;
  success: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  message?: string;
};

export type CatalogImportErrorItem = {
  code: string;
  message: string;
  stage: string;
};

export type CatalogImportExecutionReport = {
  generatedAt: string;
  dryRun: true;
  input: CatalogImportStartBody;
  stages: CatalogImportStageTiming[];
  scrapeStats: Record<string, unknown> | null;
  importSummary: {
    recordCount: number;
    normalizedCount: number;
    duplicateCount: number;
    matchingExact: number;
    matchingNoMatch: number;
    approvalDecision: string | null;
    storageUploads: number;
    previewCount: number;
    published: false;
  };
  errorSummary: {
    totalErrors: number;
    scrapeErrors: number;
    importErrors: number;
    byCode: Record<string, number>;
    items: CatalogImportErrorItem[];
  };
  performance: {
    totalDurationMs: number;
    playwrightWorkerMs: number;
    scraperMs: number;
    importPipelineMs: number;
    recordsPerSecond: number;
    vehicleCardsPerSecond: number;
  };
};

export type CatalogImportPreviewStatus = "valid" | "duplicate" | "need_review" | "rejected";

export type CatalogImportApprovalStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export type CatalogImportApprovalDecision = {
  recordId: string;
  jobId: string;
  status: CatalogImportApprovalStatus;
  actorUserId: string;
  actorRole: string;
  decidedAt: string;
  reason: string | null;
  override: boolean;
  published: false;
};

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

export type CatalogImportReportResponse = {
  report: CatalogImportExecutionReport;
  preview?: CatalogImportPreviewPayload | null;
  dryRun: true;
};

export class CatalogImportReportNotReadyError extends Error {
  constructor(message = "Import report not ready") {
    super(message);
    this.name = "CatalogImportReportNotReadyError";
  }
}

export async function startCatalogImportApi(
  body: CatalogImportStartBody
): Promise<CatalogImportStartResponse> {
  const { data } = await api.post<CatalogImportStartResponse>(
    "/api/admin/catalog/import/start",
    body
  );
  return data;
}

export async function fetchCatalogImportStatusApi(
  jobId: string
): Promise<CatalogImportJobStatusResponse> {
  const { data } = await api.get<CatalogImportJobStatusResponse>(
    `/api/admin/catalog/import/${encodeURIComponent(jobId)}`
  );
  return data;
}

export async function fetchCatalogImportReportApi(
  jobId: string
): Promise<CatalogImportReportResponse> {
  try {
    const { data } = await api.get<CatalogImportReportResponse>(
      `/api/admin/catalog/import/${encodeURIComponent(jobId)}/report`
    );
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 409) {
      throw new CatalogImportReportNotReadyError(apiErrorMessage(error));
    }
    throw error;
  }
}

export type CatalogImportApprovalBody = {
  recordIds: string[];
  reason?: string;
  override?: boolean;
};

export type CatalogImportApprovalBatchResult = {
  jobId: string;
  action: "approve" | "reject";
  dryRun: true;
  published: false;
  requested: number;
  applied: number;
  blocked: number;
  results: Array<{
    recordId: string;
    success: boolean;
    status: CatalogImportApprovalStatus;
    message: string;
  }>;
};

export async function approveCatalogImportRecordsApi(
  jobId: string,
  body: CatalogImportApprovalBody
): Promise<CatalogImportApprovalBatchResult> {
  const { data } = await api.post<CatalogImportApprovalBatchResult>(
    `/api/admin/catalog/import/${encodeURIComponent(jobId)}/approve`,
    body
  );
  return data;
}

export async function rejectCatalogImportRecordsApi(
  jobId: string,
  body: CatalogImportApprovalBody
): Promise<CatalogImportApprovalBatchResult> {
  const { data } = await api.post<CatalogImportApprovalBatchResult>(
    `/api/admin/catalog/import/${encodeURIComponent(jobId)}/reject`,
    body
  );
  return data;
}

export type CatalogPublishReport = {
  jobId: string;
  dryRun: false;
  published: true;
  startedAt: string;
  finishedAt: string;
  actorUserId: string;
  summary: {
    requested: number;
    published: number;
    failed: number;
    skippedDuplicate: number;
    skippedNotApproved: number;
    mediaFailure: number;
    validationFailure: number;
  };
  results: Array<{
    recordId: string;
    rowNumber: number;
    status: string;
    businessKey: string | null;
    catalogVariantId: string | null;
    message: string;
  }>;
};

export async function publishCatalogImportApi(
  jobId: string,
  body: { confirm: true; recordIds?: string[] }
): Promise<CatalogPublishReport> {
  const { data } = await api.post<CatalogPublishReport>(
    `/api/admin/catalog/import/${encodeURIComponent(jobId)}/publish`,
    body,
    { timeout: 120_000 }
  );
  return data;
}
