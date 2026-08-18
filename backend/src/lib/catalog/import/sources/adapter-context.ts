import type { ImportRecord } from "../import-types";
import {
  type AdapterConnectionInfo,
  type AdapterError,
  type AdapterFetchPayload,
  type AdapterNormalizeReport,
  type AdapterRunOptions,
  type AdapterStageLog,
  type AdapterValidationReport,
  type SourceAdapterKind,
  type SourceAdapterStage,
} from "./adapter-types";

let adapterRunCounter = 0;

/** Mutable context passed through source adapter lifecycle stages. */
export class AdapterContext {
  readonly runId: string;
  readonly sourceId: SourceAdapterKind;
  readonly dryRun: boolean;
  readonly initiatedBy: string | null;
  readonly createdAt: string;
  readonly metadata: Record<string, unknown>;

  private _currentStage: SourceAdapterStage | null = null;
  private _connection?: AdapterConnectionInfo;
  private _fetch?: AdapterFetchPayload;
  private _validation?: AdapterValidationReport;
  private _normalized?: AdapterNormalizeReport;
  private _stageLogs: AdapterStageLog[] = [];
  private _errors: AdapterError[] = [];
  private _warnings: string[] = [];

  constructor(sourceId: SourceAdapterKind, options: AdapterRunOptions = {}, runId?: string) {
    adapterRunCounter += 1;
    this.runId = runId ?? `adapter-run-${Date.now()}-${adapterRunCounter}`;
    this.sourceId = sourceId;
    this.dryRun = options.dryRun ?? true;
    this.initiatedBy = options.initiatedBy ?? null;
    this.createdAt = new Date().toISOString();
    this.metadata = { ...(options.metadata ?? {}), ...(options.config ? { config: options.config } : {}) };
  }

  static create(sourceId: SourceAdapterKind, options?: AdapterRunOptions, runId?: string): AdapterContext {
    return new AdapterContext(sourceId, options, runId);
  }

  get currentStage(): SourceAdapterStage | null {
    return this._currentStage;
  }

  get connection(): AdapterConnectionInfo | undefined {
    return this._connection;
  }

  get fetch(): AdapterFetchPayload | undefined {
    return this._fetch;
  }

  get validation(): AdapterValidationReport | undefined {
    return this._validation;
  }

  get normalized(): AdapterNormalizeReport | undefined {
    return this._normalized;
  }

  get records(): ImportRecord[] {
    return this._normalized?.records ?? [];
  }

  get stageLogs(): readonly AdapterStageLog[] {
    return this._stageLogs;
  }

  get errors(): readonly AdapterError[] {
    return this._errors;
  }

  get warnings(): readonly string[] {
    return this._warnings;
  }

  beginStage(stage: SourceAdapterStage): void {
    this._currentStage = stage;
    this.metadata[`stage:${stage}:startedAt`] = new Date().toISOString();
  }

  completeStage(stage: SourceAdapterStage, success: boolean, message?: string): void {
    const startedAt = String(this.metadata[`stage:${stage}:startedAt`] ?? new Date().toISOString());
    this._stageLogs.push({
      stage,
      startedAt,
      finishedAt: new Date().toISOString(),
      success,
      message,
    });
    delete this.metadata[`stage:${stage}:startedAt`];
  }

  setConnection(info: AdapterConnectionInfo): void {
    this._connection = info;
  }

  setFetch(payload: AdapterFetchPayload): void {
    this._fetch = payload;
  }

  setValidation(report: AdapterValidationReport): void {
    this._validation = report;
  }

  setNormalized(report: AdapterNormalizeReport): void {
    this._normalized = report;
  }

  addError(error: AdapterError): void {
    this._errors.push(error);
  }

  addWarning(message: string): void {
    this._warnings.push(message);
  }
}
