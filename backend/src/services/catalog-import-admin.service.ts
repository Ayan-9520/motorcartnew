import { randomUUID } from "node:crypto";
import type { CatalogImportStartBody } from "@/lib/catalog/import/catalog-import-admin.validation";
import { runCatalogImportJob } from "@/lib/catalog/import/catalog-import-job.service";
import type {
  CatalogImportJobExecutionReport,
  CatalogImportJobInput,
  CatalogImportJobResult,
  CatalogImportJobStageTiming,
} from "@/lib/catalog/import/catalog-import-job.types";
import {
  applyCatalogImportApprovalBatch,
  mergeApprovalIntoPreview,
} from "@/lib/catalog/import/catalog-import-approval.service";
import type {
  CatalogImportApprovalAction,
  CatalogImportApprovalAuditEvent,
  CatalogImportApprovalBatchResult,
  CatalogImportApprovalDecision,
  CatalogImportApprovalRequest,
} from "@/lib/catalog/import/catalog-import-approval.types";
import { buildCatalogImportPreview } from "@/lib/catalog/import/catalog-import-preview.mapper";
import type { CatalogImportPreviewPayload } from "@/lib/catalog/import/catalog-import-preview.types";
import { runCatalogPublishEngine } from "@/lib/catalog/import/publish/catalog-publish.engine";
import type { CatalogPublishReport } from "@/lib/catalog/import/publish/catalog-publish.types";
import { prisma } from "@/lib/prisma";
import type { StorageProvider } from "@/lib/storage/storage-types";

export type CatalogImportAdminJobStatus = "started" | "running" | "completed" | "failed";

export type CatalogImportAdminJobRecord = {
  jobId: string;
  status: CatalogImportAdminJobStatus;
  input: CatalogImportJobInput;
  startedAt: string;
  finishedAt?: string;
  result?: CatalogImportJobResult;
  failureMessage?: string;
  /** Phase 5D — in-memory approval decisions (no publish / no catalog DB writes). */
  approvalDecisions: Map<string, CatalogImportApprovalDecision>;
  approvalAudit: CatalogImportApprovalAuditEvent[];
  /** Phase 5E — last publish report (if any). */
  publishReport?: CatalogPublishReport;
};

export type CatalogImportJobProgress = {
  recordsProcessed: number;
  stagesCompleted: number;
  stagesTotal: number;
  percentComplete: number;
};

export type CatalogImportJobStatusResponse = {
  jobId: string;
  status: CatalogImportAdminJobStatus;
  currentStage: string | null;
  progress: CatalogImportJobProgress;
  timings: CatalogImportJobStageTiming[];
  errors: CatalogImportJobExecutionReport["errorSummary"]["items"];
  startedAt: string;
  finishedAt: string | null;
  dryRun: true;
};

export type CatalogImportAdminServiceDeps = {
  runJob?: typeof runCatalogImportJob;
  prisma?: typeof prisma;
  storage?: StorageProvider;
  allowMockStorage?: boolean;
};

export class CatalogImportAdminService {
  private readonly jobs = new Map<string, CatalogImportAdminJobRecord>();
  private readonly runJob: typeof runCatalogImportJob;
  private readonly prisma: typeof prisma;
  private readonly storage?: StorageProvider;
  private readonly allowMockStorage?: boolean;

  constructor(deps: CatalogImportAdminServiceDeps = {}) {
    this.runJob = deps.runJob ?? runCatalogImportJob;
    this.prisma = deps.prisma ?? prisma;
    this.storage = deps.storage;
    this.allowMockStorage = deps.allowMockStorage;
  }

  start(body: CatalogImportStartBody): { jobId: string; status: "started" } {
    const jobId = `catalog-import-${randomUUID()}`;
    const input: CatalogImportJobInput = {
      source: body.source,
      city: body.city,
      search: body.search,
      pages: body.pages,
      segment: body.segment,
      jobId,
    };

    const record: CatalogImportAdminJobRecord = {
      jobId,
      status: "started",
      input,
      startedAt: new Date().toISOString(),
      approvalDecisions: new Map(),
      approvalAudit: [],
    };

    this.jobs.set(jobId, record);
    void this.execute(record);

    return { jobId, status: "started" };
  }

  getJob(jobId: string): CatalogImportAdminJobRecord | undefined {
    return this.jobs.get(jobId);
  }

  getStatus(jobId: string): CatalogImportJobStatusResponse | null {
    const record = this.jobs.get(jobId);
    if (!record) return null;
    return buildStatusResponse(record);
  }

  getReport(jobId: string): CatalogImportJobExecutionReport | null {
    const record = this.jobs.get(jobId);
    if (!record?.result) return null;
    return record.result.report;
  }

  /** Preview with Phase 5D approval overlay — still dry-run / not published. */
  getPreview(jobId: string, actorRole = "admin"): CatalogImportPreviewPayload | null {
    const record = this.jobs.get(jobId);
    if (!record?.result) return null;
    const base = buildCatalogImportPreview(jobId, record.result);
    return mergeApprovalIntoPreview(base, record.approvalDecisions, actorRole);
  }

  getApprovalAudit(jobId: string): CatalogImportApprovalAuditEvent[] | null {
    const record = this.jobs.get(jobId);
    if (!record) return null;
    return [...record.approvalAudit];
  }

  applyApproval(
    jobId: string,
    action: CatalogImportApprovalAction,
    request: CatalogImportApprovalRequest,
    actor: { userId: string; role: string },
  ): CatalogImportApprovalBatchResult {
    const record = this.jobs.get(jobId);
    if (!record?.result) {
      throw new Error("IMPORT_JOB_NOT_READY");
    }

    const preview = buildCatalogImportPreview(jobId, record.result);
    return applyCatalogImportApprovalBatch({
      jobId,
      action,
      request,
      actorUserId: actor.userId,
      actorRole: actor.role,
      preview,
      existingDecisions: record.approvalDecisions,
      appendAudit: (event) => {
        record.approvalAudit.push(event);
      },
    });
  }

  getPublishReport(jobId: string): CatalogPublishReport | null {
    return this.jobs.get(jobId)?.publishReport ?? null;
  }

  async publish(
    jobId: string,
    body: { confirm: true; recordIds?: string[] },
    actor: { userId: string; role: string },
  ): Promise<CatalogPublishReport> {
    const record = this.jobs.get(jobId);
    if (!record?.result) {
      throw new Error("IMPORT_JOB_NOT_READY");
    }
    if (body.confirm !== true) {
      throw new Error("PUBLISH_CONFIRMATION_REQUIRED");
    }

    const preview = this.getPreview(jobId, actor.role);
    if (!preview) {
      throw new Error("IMPORT_JOB_NOT_READY");
    }

    const importRecords = record.result.pipeline?.context.normalizedRecords?.length
      ? [...record.result.pipeline.context.normalizedRecords]
      : [...(record.result.pipeline?.context.records ?? [])];

    const sourceCode = record.input.source === "gaadi_bazaar" ? "gaadi_bazaar" : "manual";

    const report = await runCatalogPublishEngine(
      {
        jobId,
        sourceCode,
        actorUserId: actor.userId,
        actorRole: actor.role,
        confirm: true,
        recordIds: body.recordIds,
        previewRecords: preview.records,
        decisions: record.approvalDecisions,
        importRecords,
        allowMockStorage: this.allowMockStorage,
      },
      {
        prisma: this.prisma,
        storage: this.storage,
        allowMockStorage: this.allowMockStorage,
      },
    );

    record.publishReport = report;

    for (const item of report.results) {
      if (item.status === "PUBLISHED" || item.status === "SKIPPED_DUPLICATE") {
        const decision = record.approvalDecisions.get(item.recordId);
        if (decision) {
          decision.published = true;
        }
      }
    }

    return report;
  }

  /** Register a completed job result for preview / approval (no re-scrape, no publish). */
  attachCompletedJob(result: CatalogImportJobResult): CatalogImportAdminJobRecord {
    const jobId = result.jobId;
    const record: CatalogImportAdminJobRecord = {
      jobId,
      status: result.success ? "completed" : "failed",
      input: result.input,
      startedAt: result.report.stages[0]?.startedAt ?? new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      result,
      failureMessage: result.success
        ? undefined
        : result.report.errorSummary.items[0]?.message ?? "Import job failed",
      approvalDecisions: new Map(),
      approvalAudit: [],
    };
    this.jobs.set(jobId, record);
    return record;
  }

  /** Test helper — clears in-memory job store. */
  clearJobs(): void {
    this.jobs.clear();
  }

  private async execute(record: CatalogImportAdminJobRecord): Promise<void> {
    record.status = "running";

    try {
      const result = await this.runJob(record.input);
      record.result = result;
      record.status = result.success ? "completed" : "failed";
      if (!result.success && !record.failureMessage) {
        record.failureMessage = result.report.errorSummary.items[0]?.message ?? "Import job failed";
      }
    } catch (error) {
      record.status = "failed";
      record.failureMessage = error instanceof Error ? error.message : "Import job failed";
    } finally {
      record.finishedAt = new Date().toISOString();
    }
  }
}

export function buildStatusResponse(record: CatalogImportAdminJobRecord): CatalogImportJobStatusResponse {
  const report = record.result?.report;
  const stages = report?.stages ?? [];
  const successfulStages = stages.filter((stage) => stage.success);
  const stagesTotal = stages.length;
  const stagesCompleted = successfulStages.length;

  let currentStage: string | null = null;
  if (record.status === "started") {
    currentStage = "queued";
  } else if (record.status === "running") {
    currentStage = "running";
  } else if (stages.length > 0) {
    currentStage = successfulStages.at(-1)?.stage ?? stages.at(-1)?.stage ?? null;
  } else if (record.status === "failed") {
    currentStage = "failed";
  }

  const recordsProcessed = report?.importSummary.recordCount ?? 0;
  const percentComplete =
    record.status === "completed" || record.status === "failed"
      ? 100
      : record.status === "running"
        ? 0
        : 0;

  const errors = [...(report?.errorSummary.items ?? [])];
  if (record.failureMessage && !errors.some((item) => item.message === record.failureMessage)) {
    errors.unshift({
      code: "JOB_FAILED",
      message: record.failureMessage,
      stage: "catalog_import_job",
    });
  }

  return {
    jobId: record.jobId,
    status: record.status,
    currentStage,
    progress: {
      recordsProcessed,
      stagesCompleted,
      stagesTotal,
      percentComplete: stagesTotal > 0 && record.status === "completed" ? 100 : percentComplete,
    },
    timings: stages,
    errors,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt ?? null,
    dryRun: true,
  };
}

export const catalogImportAdminService = new CatalogImportAdminService();
