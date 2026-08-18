import { ImportContext } from "./import-context";
import type { ImportPipelineRunResult } from "./import-pipeline.types";
import type { ImportJobOptions, ImportJobStatus, ImportPipelineStage } from "./import-types";

/** Tracks a single catalog import execution. */
export class ImportJob {
  readonly context: ImportContext;
  private _result: ImportPipelineRunResult | null = null;

  constructor(context: ImportContext) {
    this.context = context;
  }

  static create(options: ImportJobOptions, jobId?: string): ImportJob {
    return new ImportJob(ImportContext.create(options, jobId));
  }

  get id(): string {
    return this.context.jobId;
  }

  get status(): ImportJobStatus {
    return this.context.status;
  }

  get sourceType() {
    return this.context.sourceType;
  }

  get currentStage(): ImportPipelineStage | null {
    return this.context.currentStage;
  }

  get result(): ImportPipelineRunResult | null {
    return this._result;
  }

  attachResult(result: ImportPipelineRunResult): void {
    this._result = result;
  }

  snapshot() {
    return {
      id: this.id,
      sourceType: this.sourceType,
      status: this.status,
      currentStage: this.currentStage,
      result: this._result,
      context: this.context.snapshot(),
    };
  }
}
