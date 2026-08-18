import type {
  ImportApprovalReport,
  ImportContextSnapshot,
  ImportDuplicateReport,
  ImportJobOptions,
  ImportJobStatus,
  ImportMatchingReport,
  ImportPipelineStage,
  ImportPreviewReport,
  ImportPublishReport,
  ImportRecord,
  ImportStageLog,
  ImportStorageReport,
  ImportUploadPayload,
  ImportValidationReport,
} from "./import-types";
import { ImportError } from "./import-types";
import type { MediaPipelineReport } from "./media/media-types";

let contextCounter = 0;

/** Mutable execution context passed through import pipeline stages. */
export class ImportContext {
  readonly jobId: string;
  readonly sourceType: ImportJobOptions["sourceType"];
  readonly initiatedBy: string | null;
  readonly dryRun: boolean;
  readonly createdAt: string;

  private _status: ImportJobStatus = "pending";
  private _currentStage: ImportPipelineStage | null = null;
  private _upload?: ImportUploadPayload;
  private _records: ImportRecord[] = [];
  private _normalizedRecords: ImportRecord[] = [];
  private _validation?: ImportValidationReport;
  private _duplicates?: ImportDuplicateReport;
  private _media?: MediaPipelineReport;
  private _matching?: ImportMatchingReport;
  private _storage?: ImportStorageReport;
  private _preview?: ImportPreviewReport;
  private _approval?: ImportApprovalReport;
  private _publish?: ImportPublishReport;
  private _stageLogs: ImportStageLog[] = [];
  private _errors: ImportError[] = [];
  private _warnings: string[] = [];
  readonly metadata: Record<string, unknown>;

  constructor(jobId: string, options: ImportJobOptions) {
    this.jobId = jobId;
    this.sourceType = options.sourceType;
    this.initiatedBy = options.initiatedBy ?? null;
    this.dryRun = options.dryRun ?? true;
    this.createdAt = new Date().toISOString();
    this.metadata = { ...(options.metadata ?? {}) };
  }

  static create(options: ImportJobOptions, jobId?: string): ImportContext {
    contextCounter += 1;
    const id = jobId ?? `import-${Date.now()}-${contextCounter}`;
    return new ImportContext(id, options);
  }

  get status(): ImportJobStatus {
    return this._status;
  }

  get currentStage(): ImportPipelineStage | null {
    return this._currentStage;
  }

  get upload(): ImportUploadPayload | undefined {
    return this._upload;
  }

  get records(): readonly ImportRecord[] {
    return this._records;
  }

  get normalizedRecords(): readonly ImportRecord[] {
    return this._normalizedRecords;
  }

  get validation(): ImportValidationReport | undefined {
    return this._validation;
  }

  get duplicates(): ImportDuplicateReport | undefined {
    return this._duplicates;
  }

  get media(): MediaPipelineReport | undefined {
    return this._media;
  }

  get matching(): ImportMatchingReport | undefined {
    return this._matching;
  }

  get storage(): ImportStorageReport | undefined {
    return this._storage;
  }

  get preview(): ImportPreviewReport | undefined {
    return this._preview;
  }

  get approval(): ImportApprovalReport | undefined {
    return this._approval;
  }

  get publish(): ImportPublishReport | undefined {
    return this._publish;
  }

  get stageLogs(): readonly ImportStageLog[] {
    return this._stageLogs;
  }

  get errors(): readonly ImportError[] {
    return this._errors;
  }

  get warnings(): readonly string[] {
    return this._warnings;
  }

  setStatus(status: ImportJobStatus): void {
    this._status = status;
  }

  beginStage(stage: ImportPipelineStage): void {
    this._currentStage = stage;
    this.metadata[`stage:${stage}:startedAt`] = new Date().toISOString();
  }

  completeStage(stage: ImportPipelineStage, success: boolean, message?: string): void {
    const startedAt = String(this.metadata[`stage:${stage}:startedAt`] ?? new Date().toISOString());
    const finishedAt = new Date().toISOString();
    this._stageLogs.push({ stage, startedAt, finishedAt, success, message });
    delete this.metadata[`stage:${stage}:startedAt`];
  }

  setUpload(payload: ImportUploadPayload): void {
    this._upload = payload;
  }

  setRecords(records: ImportRecord[]): void {
    this._records = records;
  }

  setNormalizedRecords(records: ImportRecord[]): void {
    this._normalizedRecords = records;
  }

  setValidation(report: ImportValidationReport): void {
    this._validation = report;
  }

  setDuplicates(report: ImportDuplicateReport): void {
    this._duplicates = report;
  }

  setMedia(report: MediaPipelineReport): void {
    this._media = report;
  }

  setMatching(report: ImportMatchingReport): void {
    this._matching = report;
  }

  setStorage(report: ImportStorageReport): void {
    this._storage = report;
  }

  setPreview(report: ImportPreviewReport): void {
    this._preview = report;
  }

  setApproval(report: ImportApprovalReport): void {
    this._approval = report;
  }

  setPublish(report: ImportPublishReport): void {
    this._publish = report;
  }

  addError(error: ImportError): void {
    this._errors.push(error);
  }

  addWarning(message: string): void {
    this._warnings.push(message);
  }

  snapshot(): ImportContextSnapshot {
    return {
      jobId: this.jobId,
      sourceType: this.sourceType,
      currentStage: this._currentStage,
      status: this._status,
      upload: this._upload,
      records: [...this._records],
      normalizedRecords: [...this._normalizedRecords],
      validation: this._validation,
      duplicates: this._duplicates,
      media: this._media,
      matching: this._matching,
      storage: this._storage,
      preview: this._preview,
      approval: this._approval,
      publish: this._publish,
      stageLogs: [...this._stageLogs],
      errors: [...this._errors],
      warnings: [...this._warnings],
    };
  }
}
