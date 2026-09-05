import { randomUUID } from "node:crypto";
import { runCatalogMasterJsonApiDryRun } from "./catalog-master-json-api.service";
import {
  buildExecutionReport,
  buildPerformanceReport,
  buildStageTiming,
  importStageTimings,
} from "./catalog-import-job-report";
import type {
  CatalogImportJobInput,
  CatalogImportJobResult,
} from "./catalog-import-job.types";

export type CatalogImportJobOptions = {
  /** Injected media downloader (optional dry-run media). */
  mediaDownloader?: import("./media/media-types").MediaDownloader;
  /** Injected storage provider. */
  storageProvider?: import("../../storage/storage-types").StorageProvider;
};

function resolveJobId(input: CatalogImportJobInput): string {
  return input.jobId ?? `catalog-import-${randomUUID()}`;
}

/**
 * Catalog import job — JSON API / licensed feed only.
 * Live GaadiBazaar Playwright scraping was removed from the runtime stack.
 */
export async function runCatalogImportJob(
  input: CatalogImportJobInput,
  _options: CatalogImportJobOptions = {},
): Promise<CatalogImportJobResult> {
  const jobId = resolveJobId(input);
  const jobStartedMs = Date.now();

  if (input.source === "json_api") {
    const master = await runCatalogMasterJsonApiDryRun({
      jobId,
      segment: input.segment,
      catalogVariants: input.catalogVariants,
      skipMatching: !input.catalogVariants?.length,
    });
    const finishedMs = Date.now();
    const importStages = importStageTimings(master.pipeline);
    const report = buildExecutionReport({
      input,
      stages: [
        buildStageTiming(
          "json_api_adapter",
          jobStartedMs,
          finishedMs,
          master.success,
          master.success
            ? "json_api catalog master dry-run (no DB writes)"
            : master.pipeline.context.errors[0]?.message ?? "json_api dry-run failed",
        ),
        ...importStages,
      ],
      scrapeStats: null,
      pipeline: master.pipeline,
      scrapeErrors: [],
      performance: buildPerformanceReport({
        totalMs: finishedMs - jobStartedMs,
        workerMs: 0,
        scraperMs: 0,
        importMs: finishedMs - jobStartedMs,
        vehicleCount: master.summary.recordCount,
        cardCount: master.summary.recordCount,
      }),
    });

    return {
      jobId,
      success: master.success,
      input,
      payload: null,
      scrapeErrors: [],
      pipeline: master.pipeline,
      report,
    };
  }

  const finishedMs = Date.now();
  const message =
    input.source === "gaadi_bazaar"
      ? "GaadiBazaar live scrape removed. Use source=json_api (catalog master feed) instead."
      : `Unsupported source: ${input.source}`;

  const report = buildExecutionReport({
    input,
    stages: [buildStageTiming("json_api_adapter", jobStartedMs, finishedMs, false, message)],
    scrapeStats: null,
    pipeline: null,
    scrapeErrors: [{ code: "SCRAPER_REMOVED", message, retryable: false }],
    performance: buildPerformanceReport({
      totalMs: finishedMs - jobStartedMs,
      workerMs: 0,
      scraperMs: 0,
      importMs: 0,
      vehicleCount: 0,
      cardCount: 0,
    }),
  });

  return {
    jobId,
    success: false,
    input,
    payload: null,
    scrapeErrors: [{ code: "SCRAPER_REMOVED", message, retryable: false }],
    pipeline: null,
    report,
  };
}
