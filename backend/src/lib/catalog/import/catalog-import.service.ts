import type { CatalogVariantRecord } from "../types";
import { createStorageProvider } from "../../storage/storage-factory";
import type { StorageProvider } from "../../storage/storage-types";
import { ImportContext } from "./import-context";
import type { ImportPipelineDependencies } from "./import-interfaces";
import { createImportPipeline, type ImportPipelineRunResult } from "./import-pipeline";
import { GaadiBazaarAdapter } from "./sources/gaadi-bazaar/gaadi-bazaar.adapter";
import { GAADI_BAZAAR_PAYLOAD_KEY, type GaadiBazaarScraperPayload } from "./sources/gaadi-bazaar/gaadi-bazaar-types";
import type { SourceAdapter } from "./sources/source-adapter";
import type { MediaDownloader } from "./media/media-types";
import type { ImportJobOptions, ImportPipelineConfig, ImportRecord } from "./import-types";
import { DEFAULT_IMPORT_PIPELINE_CONFIG } from "./import-types";

export type CatalogImportRunOptions = ImportJobOptions & {
  jobId?: string;
  pipelineConfig?: Partial<ImportPipelineConfig>;
  preloadedRecords?: ImportRecord[];
  sourceAdapter?: SourceAdapter;
  catalogVariants?: CatalogVariantRecord[];
  mediaDownloader?: MediaDownloader;
  storageProvider?: StorageProvider;
  /** Skip file/source upload when records are preloaded or adapter ingest is used. */
  skipSourceUpload?: boolean;
};

function buildPipelineDeps(options: CatalogImportRunOptions): ImportPipelineDependencies {
  const noopSource = {
    type: options.sourceType,
    upload: async (ctx: ImportContext) => {
      if (options.preloadedRecords?.length) {
        ctx.setRecords(options.preloadedRecords);
      }
      return {
        success: true,
        stage: "upload" as const,
        data: {
          sourceType: options.sourceType,
          receivedAt: new Date().toISOString(),
          raw: null,
        },
        errors: [],
        warnings: options.skipSourceUpload ? ["Source upload skipped — using preloaded records"] : [],
        metadata: {},
      };
    },
  };

  return {
    source: noopSource,
    sourceAdapter: options.sourceAdapter,
    catalogVariants: options.catalogVariants,
    mediaDownloader: options.mediaDownloader,
    storageProvider:
      options.storageProvider ??
      createStorageProvider({ provider: "local", bucket: "catalog-import-dry-run" }),
  };
}

/** Single production catalog import entry point (Pre-Playwright hardening). */
export async function runCatalogImport(options: CatalogImportRunOptions): Promise<ImportPipelineRunResult> {
  const context = ImportContext.create(options, options.jobId);
  if (options.preloadedRecords?.length) {
    context.setRecords(options.preloadedRecords);
  }

  const pipeline = createImportPipeline(buildPipelineDeps(options), {
    ...DEFAULT_IMPORT_PIPELINE_CONFIG,
    ...options.pipelineConfig,
    dryRun: options.dryRun ?? DEFAULT_IMPORT_PIPELINE_CONFIG.dryRun,
  });

  return pipeline.run(context);
}

export type GaadiBazaarCatalogImportOptions = {
  catalogVariants?: CatalogVariantRecord[];
  mediaDownloader?: MediaDownloader;
  storageProvider?: StorageProvider;
  pipelineConfig?: Partial<ImportPipelineConfig>;
  runMedia?: boolean;
  skipMatching?: boolean;
};

/** GaadiBazaar import via unified pipeline (replaces standalone orchestrator). */
export async function runGaadiBazaarCatalogImport(
  payload: GaadiBazaarScraperPayload,
  options: GaadiBazaarCatalogImportOptions = {},
): Promise<ImportPipelineRunResult> {
  return runCatalogImport({
    sourceType: "scraper",
    dryRun: true,
    skipSourceUpload: true,
    metadata: {
      [GAADI_BAZAAR_PAYLOAD_KEY]: payload,
      payloadSegment: payload.segment,
      skipMedia: options.runMedia === false,
      skipMatching: options.skipMatching === true,
    },
    sourceAdapter: new GaadiBazaarAdapter(),
    catalogVariants: options.skipMatching ? undefined : options.catalogVariants,
    mediaDownloader: options.mediaDownloader,
    storageProvider: options.storageProvider,
    pipelineConfig: options.pipelineConfig,
  });
}
