/** End-to-end catalog import job types (Phase 4F). */

import type { GaadiBazaarScrapeError, GaadiBazaarScrapeStats } from "../../scraper/gaadi-bazaar/scraper/scraper-types";
import type { GaadiBazaarScraperPayload } from "./sources/gaadi-bazaar/gaadi-bazaar-types";
import type { ImportPipelineRunResult } from "./import-pipeline";
import type { ImportPipelineStage } from "./import-types";

/** gaadi_bazaar = listing scrape only; json_api = catalog master feed (never listings). */
export const CATALOG_IMPORT_JOB_SOURCES = ["gaadi_bazaar", "json_api"] as const;

export type CatalogImportJobSource = (typeof CATALOG_IMPORT_JOB_SOURCES)[number];

export type CatalogImportJobInput = {
  source: CatalogImportJobSource;
  city?: string;
  search?: string;
  pages?: number;
  /** Cap scraped vehicles (live controlled test default 100). */
  maxVehicles?: number;
  segment?: string;
  jobId?: string;
  catalogVariants?: import("../types").CatalogVariantRecord[];
  /** When true (default), scraper navigation uses PlaywrightWorker. */
  usePlaywrightWorker?: boolean;
  /**
   * Phase 5F controlled live scrape against www.gaadibazaar.in.
   * Uses PlaywrightBrowserDriver + host allow-list. Dry-run only — never publish.
   */
  useRealBrowser?: boolean;
  /**
   * Phase 5G — process real media URLs through the existing media pipeline.
   * Requires a non-local StorageProvider (injected via job options). Never auto-publishes.
   */
  processMedia?: boolean;
};

export type CatalogImportJobStageKind =
  | "playwright_worker"
  | "gaadi_bazaar_scraper"
  | "gaadi_bazaar_adapter"
  | "json_api_adapter"
  | ImportPipelineStage;

export type CatalogImportJobStageTiming = {
  stage: CatalogImportJobStageKind;
  label: string;
  success: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  message?: string;
};

export type CatalogImportJobErrorItem = {
  code: string;
  message: string;
  stage: CatalogImportJobStageKind | string;
};

export type CatalogImportJobErrorSummary = {
  totalErrors: number;
  scrapeErrors: number;
  importErrors: number;
  byCode: Record<string, number>;
  items: CatalogImportJobErrorItem[];
};

export type CatalogImportJobImportSummary = {
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

export type CatalogImportJobPerformanceReport = {
  totalDurationMs: number;
  playwrightWorkerMs: number;
  scraperMs: number;
  importPipelineMs: number;
  recordsPerSecond: number;
  vehicleCardsPerSecond: number;
};

export type CatalogImportJobExecutionReport = {
  generatedAt: string;
  dryRun: true;
  input: CatalogImportJobInput;
  stages: CatalogImportJobStageTiming[];
  scrapeStats: GaadiBazaarScrapeStats | null;
  importSummary: CatalogImportJobImportSummary;
  errorSummary: CatalogImportJobErrorSummary;
  performance: CatalogImportJobPerformanceReport;
};

export type CatalogImportJobResult = {
  jobId: string;
  success: boolean;
  input: CatalogImportJobInput;
  payload: GaadiBazaarScraperPayload | null;
  scrapeErrors: GaadiBazaarScrapeError[];
  pipeline: ImportPipelineRunResult | null;
  report: CatalogImportJobExecutionReport;
};
