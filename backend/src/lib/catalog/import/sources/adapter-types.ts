/** Source adapter framework types (Phase 4A). */

import type { ImportRecord } from "../import-types";

export type SourceAdapterKind =
  | "gaadi_bazaar"
  | "cardekho"
  | "oem_feed"
  | "csv"
  | "excel"
  | "dealer_upload"
  | "json_api";

export const SOURCE_ADAPTER_KINDS: readonly SourceAdapterKind[] = [
  "gaadi_bazaar",
  "cardekho",
  "oem_feed",
  "csv",
  "excel",
  "dealer_upload",
  "json_api",
] as const;

export type SourceAdapterStage = "connect" | "fetch" | "validate" | "normalize" | "disconnect";

export type AdapterError = {
  code: string;
  message: string;
  stage?: SourceAdapterStage;
  details?: Record<string, unknown>;
};

export type AdapterStageLog = {
  stage: SourceAdapterStage;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  message?: string;
};

export type AdapterConnectionInfo = {
  connected: boolean;
  connectedAt: string;
  endpoint?: string;
  metadata?: Record<string, unknown>;
};

export type AdapterFetchPayload = {
  raw: unknown;
  recordCount?: number;
  fetchedAt: string;
  byteLength?: number;
};

export type AdapterValidationReport = {
  valid: boolean;
  recordCount: number;
  issues: AdapterError[];
};

export type AdapterNormalizeReport = {
  recordCount: number;
  records: ImportRecord[];
};

export type AdapterRunOptions = {
  dryRun?: boolean;
  initiatedBy?: string;
  metadata?: Record<string, unknown>;
  /** Opaque credentials/config for future real adapters (not used in 4A). */
  config?: Record<string, unknown>;
};

export type AdapterResult<T = void> =
  | {
      success: true;
      stage: SourceAdapterStage;
      data: T;
      warnings?: string[];
      metadata?: Record<string, unknown>;
    }
  | {
      success: false;
      stage: SourceAdapterStage;
      error: AdapterError;
      warnings?: string[];
      metadata?: Record<string, unknown>;
    };

export type AdapterLifecycleResult = {
  runId: string;
  sourceId: SourceAdapterKind;
  success: boolean;
  completedStages: SourceAdapterStage[];
  failedStage?: SourceAdapterStage;
  context: import("./adapter-context").AdapterContext;
};

export function adapterSuccess<T>(
  stage: SourceAdapterStage,
  data: T,
  extras?: { warnings?: string[]; metadata?: Record<string, unknown> },
): AdapterResult<T> {
  return {
    success: true,
    stage,
    data,
    warnings: extras?.warnings,
    metadata: extras?.metadata,
  };
}

export function adapterFailure(
  stage: SourceAdapterStage,
  code: string,
  message: string,
  extras?: { details?: Record<string, unknown>; warnings?: string[]; metadata?: Record<string, unknown> },
): AdapterResult<never> {
  return {
    success: false,
    stage,
    error: { code, message, stage, details: extras?.details },
    warnings: extras?.warnings,
    metadata: extras?.metadata,
  };
}

export const SOURCE_ADAPTER_DISPLAY_NAMES: Record<SourceAdapterKind, string> = {
  gaadi_bazaar: "GaadiBazaar",
  cardekho: "CarDekho",
  oem_feed: "OEM Feed",
  csv: "CSV",
  excel: "Excel",
  dealer_upload: "Dealer Upload",
  json_api: "JSON API",
};
