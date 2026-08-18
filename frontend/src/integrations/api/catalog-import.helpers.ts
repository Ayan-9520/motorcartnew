export const CATALOG_IMPORT_SOURCES = [
  "gaadi_bazaar",
  "csv",
  "excel",
  "oem_feed",
  "json_api",
] as const;

export type CatalogImportSourceUi = (typeof CATALOG_IMPORT_SOURCES)[number];

/** Sources wired to Phase 5A admin API (dry-run). */
export const CATALOG_IMPORT_ACTIVE_SOURCES = new Set<CatalogImportSourceUi>(["gaadi_bazaar"]);

export type CatalogImportJobStatus = "started" | "running" | "completed" | "failed";

export type CatalogImportJobProgress = {
  recordsProcessed: number;
  stagesCompleted: number;
  stagesTotal: number;
  percentComplete: number;
};

export type CatalogImportJobErrorItem = {
  code?: string;
  stage?: string;
  message?: string;
};

export type CatalogImportJobStatusResponse = {
  jobId: string;
  status: CatalogImportJobStatus;
  currentStage: string | null;
  progress: CatalogImportJobProgress;
  timings: unknown[];
  errors: CatalogImportJobErrorItem[];
  startedAt: string;
  finishedAt: string | null;
  dryRun: true;
};

export function isCatalogImportJobActive(status: CatalogImportJobStatus | undefined): boolean {
  return status === "started" || status === "running";
}

export function formatCatalogImportDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function statusTotalDurationMs(status: CatalogImportJobStatusResponse): number | null {
  if (!status.startedAt) return null;
  const end = status.finishedAt ? Date.parse(status.finishedAt) : Date.now();
  const start = Date.parse(status.startedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(0, end - start);
}
