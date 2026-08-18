import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { detectDuplicatesFromImportRecords } from "../duplicate/duplicate-detection.engine";
import { validateImportRecords } from "../validation/catalog-validation.engine";
import type { CatalogImportApprovalDecision } from "../catalog-import-approval.types";
import type { CatalogImportPreviewRecord } from "../catalog-import-preview.types";
import type { ImportRecord } from "../import-types";
import { selectApprovedPublishCandidates } from "./catalog-publish-candidates";
import { resolveCatalogPublishStorage } from "./catalog-publish-storage";
import { upsertApprovedCatalogRecord } from "./catalog-publish-upsert";
import type {
  CatalogPublishAuditEvent,
  CatalogPublishEngineOptions,
  CatalogPublishRecordResult,
  CatalogPublishReport,
  CatalogPublishSummary,
} from "./catalog-publish.types";
import type { StorageProvider } from "../../../storage/storage-types";
import { assertCatalogSourceMayPublish } from "../../source-classification";

export type CatalogPublishEngineDeps = {
  prisma: PrismaClient;
  storage?: StorageProvider;
  allowMockStorage?: boolean;
};

const publishLocks = new Map<string, Promise<CatalogPublishReport>>();

function emptySummary(): CatalogPublishSummary {
  return {
    requested: 0,
    published: 0,
    failed: 0,
    skippedDuplicate: 0,
    skippedNotApproved: 0,
    mediaFailure: 0,
    validationFailure: 0,
  };
}

/**
 * Production catalog publish engine (Phase 5E).
 * Only APPROVED import records are published. Per-record transactions; retry-safe; idempotent.
 */
export async function runCatalogPublishEngine(
  options: CatalogPublishEngineOptions & {
    previewRecords: CatalogImportPreviewRecord[];
    decisions: Map<string, CatalogImportApprovalDecision>;
    importRecords: ImportRecord[];
  },
  deps: CatalogPublishEngineDeps,
): Promise<CatalogPublishReport> {
  if (options.confirm !== true) {
    throw new Error("PUBLISH_CONFIRMATION_REQUIRED");
  }

  assertCatalogSourceMayPublish({
    sourceCode: options.sourceCode,
    sourceUrl:
      options.sourceCode === "json_api" ? process.env.CATALOG_MASTER_SOURCE_URL : undefined,
    apiKey: options.sourceCode === "json_api" ? process.env.CATALOG_MASTER_API_KEY : undefined,
  });

  const locked = publishLocks.get(options.jobId);
  if (locked) {
    return locked;
  }

  const run = executePublish(options, deps).finally(() => {
    publishLocks.delete(options.jobId);
  });
  publishLocks.set(options.jobId, run);
  return run;
}

async function executePublish(
  options: CatalogPublishEngineOptions & {
    previewRecords: CatalogImportPreviewRecord[];
    decisions: Map<string, CatalogImportApprovalDecision>;
    importRecords: ImportRecord[];
  },
  deps: CatalogPublishEngineDeps,
): Promise<CatalogPublishReport> {
  const startedAt = new Date().toISOString();
  const summary = emptySummary();
  const results: CatalogPublishRecordResult[] = [];
  const audit: CatalogPublishAuditEvent[] = [];

  const storageResolution = resolveCatalogPublishStorage({
    allowMockStorage: options.allowMockStorage ?? deps.allowMockStorage,
    injected: deps.storage,
  });
  if (!storageResolution.ok) {
    throw Object.assign(new Error(storageResolution.message), { code: storageResolution.code });
  }

  const { candidates, skippedNotApproved } = selectApprovedPublishCandidates({
    previewRecords: options.previewRecords,
    decisions: options.decisions,
    importRecords: options.importRecords,
    recordIds: options.recordIds,
  });

  summary.requested = candidates.length + skippedNotApproved.length;
  summary.skippedNotApproved = skippedNotApproved.length;

  for (const skipped of skippedNotApproved) {
    results.push({
      recordId: skipped.recordId,
      rowNumber: skipped.preview.rowNumber,
      status: "REJECTED",
      businessKey: null,
      catalogVariantId: null,
      externalId: null,
      message: `Not approved (status=${skipped.decision.status}) — publish skipped`,
      mediaUploaded: false,
    });
    audit.push({
      id: randomUUID(),
      jobId: options.jobId,
      source: options.sourceCode,
      externalId: null,
      recordId: skipped.recordId,
      publishedRecordId: null,
      actorUserId: options.actorUserId,
      timestamp: new Date().toISOString(),
      action: "skip",
      success: false,
      errorReason: "NOT_APPROVED",
    });
  }

  // Final validation on approved import records (reuse Phase 3C engine).
  const approvedImportRecords = candidates
    .map((c) => c.importRecord)
    .filter((r): r is ImportRecord => Boolean(r));
  const validation = validateImportRecords(approvedImportRecords);
  const rejectedRows = new Set(validation.rejectedRecords.map((r) => r.rowNumber));

  // Final duplicate check (reuse Phase 3D engine) — hard duplicates blocked unless override.
  const duplicateReport = detectDuplicatesFromImportRecords(approvedImportRecords);
  const hardDuplicateRows = new Set(
    duplicateReport.results
      .filter((r) => r.classification === "DUPLICATE")
      .map((r) => r.rowNumber),
  );

  for (const candidate of candidates) {
    const { preview, decision, importRecord } = candidate;

    if (rejectedRows.has(preview.rowNumber) && !decision.override) {
      summary.failed += 1;
      summary.validationFailure += 1;
      results.push({
        recordId: candidate.recordId,
        rowNumber: preview.rowNumber,
        status: "FAILED",
        businessKey: null,
        catalogVariantId: null,
        externalId: null,
        message: "Final validation failed",
        mediaUploaded: false,
      });
      audit.push(makeAudit(options, candidate.recordId, null, null, false, "VALIDATION_FAILED"));
      continue;
    }

    if (hardDuplicateRows.has(preview.rowNumber) && !decision.override) {
      summary.failed += 1;
      results.push({
        recordId: candidate.recordId,
        rowNumber: preview.rowNumber,
        status: "FAILED",
        businessKey: null,
        catalogVariantId: null,
        externalId: null,
        message: "Final duplicate check blocked publish (override required)",
        mediaUploaded: false,
      });
      audit.push(makeAudit(options, candidate.recordId, null, null, false, "DUPLICATE_BLOCKED"));
      continue;
    }

    const upsert = await upsertApprovedCatalogRecord(
      {
        prisma: deps.prisma,
        storage: storageResolution.provider,
        jobId: options.jobId,
        sourceCode: options.sourceCode,
        actorUserId: options.actorUserId,
      },
      preview,
      importRecord,
    );

    if (!upsert.ok) {
      summary.failed += 1;
      if (upsert.validationFailure) summary.validationFailure += 1;
      if (upsert.mediaFailure) summary.mediaFailure += 1;
      results.push({
        recordId: candidate.recordId,
        rowNumber: preview.rowNumber,
        status: "FAILED",
        businessKey: upsert.businessKey ?? null,
        catalogVariantId: null,
        externalId: upsert.externalId ?? null,
        message: upsert.message,
        mediaUploaded: false,
      });
      audit.push(
        makeAudit(options, candidate.recordId, upsert.externalId ?? null, null, false, upsert.code),
      );
      continue;
    }

    if (upsert.skippedDuplicate) {
      summary.skippedDuplicate += 1;
      results.push({
        recordId: candidate.recordId,
        rowNumber: preview.rowNumber,
        status: "SKIPPED_DUPLICATE",
        businessKey: upsert.businessKey,
        catalogVariantId: upsert.catalogVariantId,
        externalId: upsert.externalId,
        message: "Already published for this import job (idempotent skip)",
        mediaUploaded: upsert.mediaUploaded,
      });
      audit.push(
        makeAudit(
          options,
          candidate.recordId,
          upsert.externalId,
          upsert.catalogVariantId,
          true,
          null,
          "skip",
        ),
      );
      continue;
    }

    summary.published += 1;
    if (upsert.mediaFailure) summary.mediaFailure += 1;
    results.push({
      recordId: candidate.recordId,
      rowNumber: preview.rowNumber,
      status: "PUBLISHED",
      businessKey: upsert.businessKey,
      catalogVariantId: upsert.catalogVariantId,
      externalId: upsert.externalId,
      message: upsert.created ? "Published new catalog variant" : "Updated existing catalog variant",
      mediaUploaded: upsert.mediaUploaded,
    });
    audit.push(
      makeAudit(options, candidate.recordId, upsert.externalId, upsert.catalogVariantId, true, null),
    );

    // Best-effort durable audit via ActivityLog (existing table — no schema change).
    try {
      await deps.prisma.activityLog.create({
        data: {
          userId: options.actorUserId,
          action: "catalog_import_publish",
          metadata: {
            jobId: options.jobId,
            recordId: candidate.recordId,
            catalogVariantId: upsert.catalogVariantId,
            businessKey: upsert.businessKey,
            externalId: upsert.externalId,
            source: options.sourceCode,
            success: true,
          },
        },
      });
    } catch {
      /* non-fatal */
    }
  }

  return {
    jobId: options.jobId,
    dryRun: false,
    published: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    actorUserId: options.actorUserId,
    summary,
    results,
    audit,
  };
}

function makeAudit(
  options: CatalogPublishEngineOptions,
  recordId: string,
  externalId: string | null,
  publishedRecordId: string | null,
  success: boolean,
  errorReason: string | null,
  action: "publish" | "skip" | "fail" = success ? "publish" : "fail",
): CatalogPublishAuditEvent {
  return {
    id: randomUUID(),
    jobId: options.jobId,
    source: options.sourceCode,
    externalId,
    recordId,
    publishedRecordId,
    actorUserId: options.actorUserId,
    timestamp: new Date().toISOString(),
    action: errorReason && !success ? "fail" : action,
    success,
    errorReason,
  };
}

/** Test helper — clear concurrent publish locks. */
export function clearCatalogPublishLocks(): void {
  publishLocks.clear();
}
