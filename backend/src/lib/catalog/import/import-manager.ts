import { ImportContext } from "./import-context";
import { ImportJob } from "./import-job";
import type { ImportPipelineDependencies } from "./import-interfaces";
import { ImportPipeline, createImportPipeline } from "./import-pipeline";
import type { ImportJobOptions, ImportPipelineConfig } from "./import-types";
import { DEFAULT_IMPORT_PIPELINE_CONFIG } from "./import-types";

export type ImportManagerConfig = {
  pipeline: ImportPipelineConfig;
};

/**
 * Entry point for catalog import jobs (Phase 3A — in-memory, no DB writes).
 */
export class ImportManager {
  private readonly jobs = new Map<string, ImportJob>();
  private readonly pipeline: ImportPipeline;

  constructor(
    deps: ImportPipelineDependencies,
    config: Partial<ImportManagerConfig> = {},
  ) {
    this.pipeline = createImportPipeline(deps, config.pipeline ?? DEFAULT_IMPORT_PIPELINE_CONFIG);
  }

  createJob(options: ImportJobOptions, jobId?: string): ImportJob {
    const job = ImportJob.create(options, jobId);
    this.jobs.set(job.id, job);
    return job;
  }

  getJob(jobId: string): ImportJob | undefined {
    return this.jobs.get(jobId);
  }

  listJobs(): ImportJob[] {
    return [...this.jobs.values()];
  }

  async runJob(job: ImportJob | string): Promise<ImportJob> {
    const resolved = typeof job === "string" ? this.jobs.get(job) : job;
    if (!resolved) {
      throw new Error(`Import job not found: ${typeof job === "string" ? job : job.id}`);
    }

    const result = await this.pipeline.run(resolved.context);
    resolved.attachResult(result);
    return resolved;
  }

  async runNewJob(options: ImportJobOptions, jobId?: string): Promise<ImportJob> {
    const job = this.createJob(options, jobId);
    return this.runJob(job);
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      return false;
    }
    job.context.setStatus("cancelled");
    return true;
  }
}

export function createImportManager(
  deps: ImportPipelineDependencies,
  config?: Partial<ImportManagerConfig>,
): ImportManager {
  return new ImportManager(deps, config);
}
