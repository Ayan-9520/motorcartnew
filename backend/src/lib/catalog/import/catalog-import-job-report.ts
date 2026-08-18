import type { GaadiBazaarScrapeError } from "../../scraper/gaadi-bazaar/scraper/scraper-types";
import type { ImportError } from "./import-types";
import type { ImportPipelineRunResult } from "./import-pipeline";
import type {
  CatalogImportJobErrorItem,
  CatalogImportJobErrorSummary,
  CatalogImportJobExecutionReport,
  CatalogImportJobImportSummary,
  CatalogImportJobInput,
  CatalogImportJobPerformanceReport,
  CatalogImportJobStageTiming,
  CatalogImportJobStageKind,
} from "./catalog-import-job.types";
import type { GaadiBazaarScrapeStats } from "../../scraper/gaadi-bazaar/scraper/scraper-types";

const STAGE_LABELS: Record<CatalogImportJobStageKind, string> = {
  playwright_worker: "Playwright Worker",
  gaadi_bazaar_scraper: "GaadiBazaar Scraper",
  gaadi_bazaar_adapter: "GaadiBazaar Adapter (ingest)",
  json_api_adapter: "JSON API Catalog Master (ingest)",
  upload: "Upload / Adapter Ingest",
  validate: "Validation",
  normalize: "Normalization",
  duplicate_check: "Duplicate Detection",
  media: "Media Pipeline",
  matching: "Catalog Matching",
  approve: "Approval",
  storage: "Storage (mock)",
  preview: "Preview (dry-run)",
  publish: "Publish (dry-run skip)",
};

export function stageLabel(stage: CatalogImportJobStageKind): string {
  return STAGE_LABELS[stage] ?? stage;
}

export function buildStageTiming(
  stage: CatalogImportJobStageKind,
  startedMs: number,
  finishedMs: number,
  success: boolean,
  message?: string,
): CatalogImportJobStageTiming {
  const startedAt = new Date(startedMs).toISOString();
  const finishedAt = new Date(finishedMs).toISOString();
  return {
    stage,
    label: stageLabel(stage),
    success,
    startedAt,
    finishedAt,
    durationMs: Math.max(0, finishedMs - startedMs),
    message,
  };
}

export function buildErrorSummary(
  scrapeErrors: readonly GaadiBazaarScrapeError[],
  importErrors: readonly ImportError[],
  extra: readonly CatalogImportJobErrorItem[] = [],
): CatalogImportJobErrorSummary {
  const items: CatalogImportJobErrorItem[] = [
    ...scrapeErrors.map((e) => ({
      code: e.code,
      message: e.message,
      stage: "gaadi_bazaar_scraper",
    })),
    ...importErrors.map((e) => ({
      code: e.code,
      message: e.message,
      stage: e.stage ?? "import",
    })),
    ...extra,
  ];

  const byCode: Record<string, number> = {};
  for (const item of items) {
    byCode[item.code] = (byCode[item.code] ?? 0) + 1;
  }

  return {
    totalErrors: items.length,
    scrapeErrors: scrapeErrors.length,
    importErrors: importErrors.length,
    byCode,
    items,
  };
}

export function buildImportSummary(pipeline: ImportPipelineRunResult | null): CatalogImportJobImportSummary {
  const ctx = pipeline?.context;
  return {
    recordCount: ctx?.records.length ?? 0,
    normalizedCount: ctx?.normalizedRecords.length ?? 0,
    duplicateCount: ctx?.duplicates?.duplicateCount ?? 0,
    matchingExact: ctx?.matching?.exactMatches ?? 0,
    matchingNoMatch: ctx?.matching?.noMatches ?? 0,
    approvalDecision: ctx?.approval?.decision ?? null,
    storageUploads: ctx?.storage?.uploadedCount ?? 0,
    previewCount: ctx?.preview?.recordCount ?? 0,
    published: false,
  };
}

export function buildPerformanceReport(options: {
  totalMs: number;
  workerMs: number;
  scraperMs: number;
  importMs: number;
  vehicleCount: number;
  cardCount: number;
}): CatalogImportJobPerformanceReport {
  const seconds = Math.max(options.totalMs / 1000, 0.001);
  return {
    totalDurationMs: options.totalMs,
    playwrightWorkerMs: options.workerMs,
    scraperMs: options.scraperMs,
    importPipelineMs: options.importMs,
    recordsPerSecond: Math.round((options.vehicleCount / seconds) * 100) / 100,
    vehicleCardsPerSecond: Math.round((options.cardCount / seconds) * 100) / 100,
  };
}

export function buildExecutionReport(options: {
  input: CatalogImportJobInput;
  stages: CatalogImportJobStageTiming[];
  scrapeStats: GaadiBazaarScrapeStats | null;
  pipeline: ImportPipelineRunResult | null;
  scrapeErrors: GaadiBazaarScrapeError[];
  performance: CatalogImportJobPerformanceReport;
}): CatalogImportJobExecutionReport {
  return {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    input: options.input,
    stages: options.stages,
    scrapeStats: options.scrapeStats,
    importSummary: buildImportSummary(options.pipeline),
    errorSummary: buildErrorSummary(
      options.scrapeErrors,
      options.pipeline?.context.errors ?? [],
    ),
    performance: options.performance,
  };
}

export function importStageTimings(
  pipeline: ImportPipelineRunResult,
  adapterDurationMs?: number,
): CatalogImportJobStageTiming[] {
  const timings: CatalogImportJobStageTiming[] = [];

  if (adapterDurationMs !== undefined) {
    timings.push({
      stage: "gaadi_bazaar_adapter",
      label: stageLabel("gaadi_bazaar_adapter"),
      success: true,
      startedAt: pipeline.context.stageLogs[0]?.startedAt ?? new Date().toISOString(),
      finishedAt: pipeline.context.stageLogs[0]?.startedAt ?? new Date().toISOString(),
      durationMs: adapterDurationMs,
    });
  }

  for (const log of pipeline.context.stageLogs) {
    const startedMs = Date.parse(log.startedAt);
    const finishedMs = Date.parse(log.finishedAt);
    timings.push({
      stage: log.stage,
      label: stageLabel(log.stage),
      success: log.success,
      startedAt: log.startedAt,
      finishedAt: log.finishedAt,
      durationMs: Number.isFinite(startedMs) && Number.isFinite(finishedMs)
        ? Math.max(0, finishedMs - startedMs)
        : 0,
      message: log.message,
    });
  }

  return timings;
}
