import { createCatalogMatchingService } from "../catalog-matching.service";
import type { CatalogVariantRecord } from "../types";
import { createStorageProvider } from "../../storage/storage-factory";
import type { StorageProvider } from "../../storage/storage-types";
import { runDuplicateDetection } from "./duplicate/catalog-duplicate-detector";
import type { ImportContext } from "./import-context";
import type { ImportPipelineDependencies } from "./import-interfaces";
import { importRecordToStandard, normalizeImportRecords } from "./import-record-normalizer";
import { extractMediaFromImportRecords } from "./media/catalog-media-input";
import { runCatalogMediaPipeline } from "./media/catalog-media-processor";
import { createFetchMediaDownloader } from "./media/media-downloader";
import { createDryRunMediaDownloader } from "./media/mock-media-downloader";
import type { MediaDownloader } from "./media/media-types";
import { ingestSourceAdapterUpload } from "./source-ingest";
import { validateImportRecords } from "./validation/catalog-validation.engine";
import {
  DEFAULT_IMPORT_PIPELINE_CONFIG,
  IMPORT_PIPELINE_STAGES,
  ImportError,
  importFailure,
  importSuccess,
  type ImportApprovalReport,
  type ImportMatchingReport,
  type ImportPipelineConfig,
  type ImportPipelineStage,
  type ImportResult,
  type ImportStorageReport,
} from "./import-types";

export type { ImportPipelineRunResult } from "./import-pipeline.types";
import type { ImportPipelineRunResult } from "./import-pipeline.types";

const APPROVAL_AUTO_MIN = 80;
const APPROVAL_REJECT_MAX = 0;

/**
 * Unified catalog import pipeline (Pre-Playwright hardening).
 * Parser → Validation → Normalization → Duplicate → Media → Matching → Approval → Storage → Preview → Publish
 */
export class ImportPipeline {
  constructor(
    private readonly deps: ImportPipelineDependencies,
    private readonly config: ImportPipelineConfig = DEFAULT_IMPORT_PIPELINE_CONFIG,
  ) {}

  async run(context: ImportContext): Promise<ImportPipelineRunResult> {
    const completedStages: ImportPipelineStage[] = [];
    context.setStatus("running");

    for (const stage of IMPORT_PIPELINE_STAGES) {
      context.beginStage(stage);
      const result = await this.runStage(stage, context);
      context.completeStage(stage, result.success, result.errors[0]?.message);

      if (!result.success) {
        for (const err of result.errors) context.addError(err);
        for (const warn of result.warnings) context.addWarning(warn);
        context.setStatus("failed");
        return {
          jobId: context.jobId,
          success: false,
          completedStages,
          failedStage: stage,
          finalStage: stage,
          context,
        };
      }

      for (const warn of result.warnings) context.addWarning(warn);
      completedStages.push(stage);
    }

    context.setStatus("completed");
    return {
      jobId: context.jobId,
      success: true,
      completedStages,
      finalStage: "publish",
      context,
    };
  }

  private async runStage(stage: ImportPipelineStage, context: ImportContext): Promise<ImportResult> {
    switch (stage) {
      case "upload":
        return this.stageUpload(context);
      case "validate":
        return this.stageValidate(context);
      case "normalize":
        return this.stageNormalize(context);
      case "duplicate_check":
        return this.stageDuplicateCheck(context);
      case "media":
        return this.stageMedia(context);
      case "matching":
        return this.stageMatching(context);
      case "approve":
        return this.stageApprove(context);
      case "storage":
        return this.stageStorage(context);
      case "preview":
        return this.stagePreview(context);
      case "publish":
        return this.stagePublish(context);
      default:
        return importFailure(stage, [
          new ImportError(`Unknown pipeline stage: ${stage satisfies never}`, "UNKNOWN_STAGE", { stage }),
        ]);
    }
  }

  private async stageUpload(context: ImportContext): Promise<ImportResult> {
    if (this.deps.sourceAdapter) {
      const ingestResult = await ingestSourceAdapterUpload(context, this.deps.sourceAdapter);
      if (!ingestResult.success || context.metadata.ingestSuccess === false) {
        return importFailure("upload", [
          new ImportError("Source adapter ingest failed", "INGEST_FAILED", { stage: "upload" }),
        ], { warnings: ingestResult.warnings });
      }
      return ingestResult;
    }

    const uploadResult = await this.deps.source.upload(context);
    if (!uploadResult.success || !uploadResult.data) {
      return uploadResult;
    }

    context.setUpload(uploadResult.data);

    if (this.deps.parser) {
      const parseResult = await this.deps.parser.parse(context);
      if (!parseResult.success) return parseResult;
      if (parseResult.data) context.setRecords(parseResult.data);
      return importSuccess("upload", uploadResult.data, {
        warnings: [
          ...uploadResult.warnings,
          ...parseResult.warnings,
          ...(parseResult.data?.length ? [] : ["Parser returned no records"]),
        ],
        metadata: { recordCount: parseResult.data?.length ?? 0 },
      });
    }

    if (!context.records.length) {
      context.addWarning("ImportParser not configured — records deferred to ingest or preloaded context");
      context.setRecords([]);
    }

    return importSuccess("upload", uploadResult.data, { warnings: uploadResult.warnings });
  }

  private async stageValidate(context: ImportContext): Promise<ImportResult> {
    if (this.deps.validator) {
      const result = await this.deps.validator.validate(context);
      if (result.data) context.setValidation(result.data);
      if (result.success && result.data && !result.data.valid) {
        return importFailure("validate", [
          new ImportError("Validation failed", "VALIDATION_FAILED", {
            stage: "validate",
            details: { issueCount: result.data.issues.length },
          }),
        ], { warnings: result.warnings });
      }
      return result;
    }

    const catalogReport = validateImportRecords([...context.records]);
    context.metadata.catalogValidationReport = catalogReport;
    const report = {
      valid: catalogReport.rejectedRecords.length === 0,
      recordCount: context.records.length,
      issues: catalogReport.errors.map((e) => ({
        code: e.code,
        message: e.message,
        rowNumber: e.rowNumber,
        field: e.field,
      })),
    };
    context.setValidation(report);

    if (!report.valid) {
      return importFailure("validate", [
        new ImportError("Validation failed", "VALIDATION_FAILED", {
          stage: "validate",
          details: { rejectedCount: catalogReport.rejectedRecords.length },
        }),
      ], { warnings: [`${catalogReport.rejectedRecords.length} row(s) rejected`] });
    }

    return importSuccess("validate", report);
  }

  private async stageNormalize(context: ImportContext): Promise<ImportResult> {
    const payloadSegment = context.metadata.payloadSegment ?? context.metadata.scraperPayloadSegment;
    const normalized = normalizeImportRecords([...context.records], payloadSegment);
    context.setNormalizedRecords(normalized);
    context.metadata.normalizationIssueCount = context.records.length - normalized.length;

    const warnings: string[] = [];
    if (context.records.length && !normalized.length) {
      warnings.push("All rows failed normalization");
    } else if (normalized.length < context.records.length) {
      warnings.push(`${context.records.length - normalized.length} row(s) dropped during normalization`);
    }

    return importSuccess("normalize", normalized, {
      metadata: { normalizedCount: normalized.length },
      warnings,
    });
  }

  private async stageDuplicateCheck(context: ImportContext): Promise<ImportResult> {
    const report = runDuplicateDetection(context);
    const importReport = context.duplicates!;
    const warnings: string[] = [];
    if (report.summary.duplicateCount > 0) {
      warnings.push(`${report.summary.duplicateCount} duplicate row(s) detected`);
    }
    if (report.summary.possibleDuplicateCount > 0) {
      warnings.push(`${report.summary.possibleDuplicateCount} possible duplicate row(s) detected`);
    }
    return importSuccess("duplicate_check", importReport, {
      warnings,
      metadata: {
        duplicateGroupCount: report.summary.groupCount,
        mergeRecommendationCount: report.mergeRecommendations.length,
      },
    });
  }

  private async stageMedia(context: ImportContext): Promise<ImportResult> {
    if (context.metadata.skipMedia) {
      context.addWarning("Media stage skipped by request");
      return importSuccess("media", undefined, { metadata: { skipped: true } });
    }

    const records = context.normalizedRecords.length ? [...context.normalizedRecords] : [...context.records];
    const inputs = extractMediaFromImportRecords(records);
    const downloader: MediaDownloader =
      this.deps.mediaDownloader ??
      (context.dryRun || this.config.dryRun
        ? createDryRunMediaDownloader(inputs)
        : createFetchMediaDownloader());

    const report = await runCatalogMediaPipeline(context, {
      downloader,
      records,
    });
    context.setMedia(report);

    return importSuccess("media", report, {
      metadata: {
        itemCount: report.items.length,
        validImages: report.validImages.length,
        brokenUrls: report.brokenUrls.length,
      },
    });
  }

  private async stageMatching(context: ImportContext): Promise<ImportResult> {
    if (context.metadata.skipMatching) {
      const report: ImportMatchingReport = {
        checked: false,
        resultCount: 0,
        exactMatches: 0,
        weakMatches: 0,
        noMatches: 0,
        results: [],
      };
      context.setMatching(report);
      return importSuccess("matching", report, { metadata: { skipped: true } });
    }

    const variants = this.deps.catalogVariants ?? [];
    const records = context.normalizedRecords.length ? [...context.normalizedRecords] : [...context.records];

    if (!variants.length) {
      const report: ImportMatchingReport = {
        checked: false,
        resultCount: 0,
        exactMatches: 0,
        weakMatches: 0,
        noMatches: 0,
        results: [],
      };
      context.setMatching(report);
      context.addWarning("Catalog variants not configured — matching skipped");
      return importSuccess("matching", report);
    }

    const matcher = createCatalogMatchingService(variants);
    const results = records.map((record) => {
      const standard = importRecordToStandard(record);
      if (!standard) {
        return matcher.match({
          segment: record.segment,
          brand: "",
          model: "",
          variant: "",
          fuel: "",
          transmission: "",
          modelYear: 0,
        });
      }
      return matcher.match({
        segment: standard.segment,
        brand: standard.brand,
        model: standard.model,
        variant: standard.variant,
        fuel: standard.fuel,
        transmission: standard.transmission,
        modelYear: standard.year,
      });
    });

    const report: ImportMatchingReport = {
      checked: true,
      resultCount: results.length,
      exactMatches: results.filter((r) => r.method === "exact" || r.method === "normalized").length,
      weakMatches: results.filter((r) => r.method === "alias" || r.method === "fuzzy").length,
      noMatches: results.filter((r) => r.method === "none").length,
      results,
    };
    context.setMatching(report);
    context.metadata.catalogMatchingResults = results;

    return importSuccess("matching", report, {
      metadata: {
        exactMatches: report.exactMatches,
        noMatches: report.noMatches,
      },
    });
  }

  private async stageApprove(context: ImportContext): Promise<ImportResult> {
    const recordCount = context.normalizedRecords.length || context.records.length;
    if (recordCount < this.config.minRecordsForApproval) {
      const report: ImportApprovalReport = {
        decision: "rejected",
        autoApproved: false,
        reason: `Insufficient records (${recordCount}) for approval`,
        approvedCount: 0,
        rejectedCount: recordCount,
        manualReviewCount: 0,
      };
      context.setApproval(report);
      return importFailure("approve", [
        new ImportError(report.reason, "APPROVAL_REJECTED", { stage: "approve", details: { recordCount } }),
      ]);
    }

    const matching = context.matching;
    let rejectedCount = 0;
    let manualReviewCount = 0;
    let approvedCount = recordCount;

    if (matching?.checked) {
      rejectedCount = matching.results.filter((r) => r.confidence <= APPROVAL_REJECT_MAX).length;
      manualReviewCount = matching.results.filter(
        (r) => r.confidence > APPROVAL_REJECT_MAX && r.confidence < APPROVAL_AUTO_MIN,
      ).length;
      approvedCount = matching.results.filter((r) => r.confidence >= APPROVAL_AUTO_MIN).length;

      const duplicateHard = context.duplicates?.duplicateCount ?? 0;
      if (duplicateHard > 0) {
        manualReviewCount += duplicateHard;
      }

      if (rejectedCount > 0 && approvedCount === 0) {
        const report: ImportApprovalReport = {
          decision: "rejected",
          autoApproved: false,
          reason: "No rows met auto-approval confidence threshold",
          approvedCount,
          rejectedCount,
          manualReviewCount,
        };
        context.setApproval(report);
        return importFailure("approve", [
          new ImportError(report.reason, "APPROVAL_REJECTED", { stage: "approve" }),
        ]);
      }

      if (manualReviewCount > 0) {
        const report: ImportApprovalReport = {
          decision: "pending",
          autoApproved: false,
          reason: "Dry-run manual review required (matching confidence or duplicates)",
          approvedCount,
          rejectedCount,
          manualReviewCount,
        };
        context.setApproval(report);
        return importSuccess("approve", report, {
          warnings: [`${manualReviewCount} row(s) require manual review`],
        });
      }
    }

    const report: ImportApprovalReport = {
      decision: "approved",
      autoApproved: true,
      reason: "Dry-run auto-approval (no persistence)",
      approvedCount,
      rejectedCount,
      manualReviewCount,
    };
    context.setApproval(report);
    return importSuccess("approve", report);
  }

  private async stageStorage(context: ImportContext): Promise<ImportResult> {
    const provider: StorageProvider =
      this.deps.storageProvider ??
      createStorageProvider({ provider: "local", bucket: "catalog-import-dry-run" });

    const mediaReport = context.media;
    const manifest: ImportStorageReport["manifest"] = [];
    let failedCount = 0;

    for (const item of mediaReport?.validImages ?? []) {
      const hash = item.metadata?.sha256 ?? "media";
      const key = `imports/${context.jobId}/row-${item.rowNumber}/${hash}.bin`;
      const upload = await provider.upload({
        key,
        body: Buffer.alloc(Math.max(item.metadata?.byteLength ?? 0, 1)),
        contentType: item.metadata?.contentType ?? "application/octet-stream",
      });
      if (upload.success) {
        manifest.push({
          key,
          sourceUrl: item.url,
          rowNumber: item.rowNumber,
          contentType: item.metadata?.contentType ?? "application/octet-stream",
          dryRun: true,
        });
      } else {
        failedCount += 1;
      }
    }

    const report: ImportStorageReport = {
      dryRun: true,
      provider: provider.provider,
      uploadedCount: manifest.length,
      failedCount,
      manifest,
    };
    context.setStorage(report);
    context.metadata.catalogStorageReport = report;

    return importSuccess("storage", report, {
      metadata: { uploadedCount: manifest.length, failedCount },
    });
  }

  private async stagePreview(context: ImportContext): Promise<ImportResult> {
    const records = context.normalizedRecords.length ? [...context.normalizedRecords] : [...context.records];
    const report = {
      recordCount: records.length,
      sampleRecords: records.slice(0, 10),
      summary: {
        sourceType: context.sourceType,
        totalRecords: records.length,
        dryRun: context.dryRun ? "yes" : "no",
        mediaItems: context.media?.items.length ?? 0,
        storageUploads: context.storage?.uploadedCount ?? 0,
        matchingExact: context.matching?.exactMatches ?? 0,
      },
    };
    context.setPreview(report);
    return importSuccess("preview", report);
  }

  private async stagePublish(context: ImportContext): Promise<ImportResult> {
    if (this.config.dryRun || context.dryRun) {
      const report = {
        published: false,
        dryRun: true as const,
        wouldPublishCount: context.normalizedRecords.length || context.records.length,
        message: "Dry-run publish — no database writes",
      };
      context.setPublish(report);
      return importSuccess("publish", report);
    }

    if (!this.deps.publisher) {
      return importFailure("publish", [
        new ImportError("ImportPublisher not configured", "PUBLISHER_NOT_CONFIGURED", { stage: "publish" }),
      ]);
    }

    const result = await this.deps.publisher.publish(context);
    if (result.data) context.setPublish(result.data);
    return result;
  }
}

export function createImportPipeline(
  deps: ImportPipelineDependencies,
  config?: Partial<ImportPipelineConfig>,
): ImportPipeline {
  return new ImportPipeline(deps, { ...DEFAULT_IMPORT_PIPELINE_CONFIG, ...config });
}
