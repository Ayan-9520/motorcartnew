import type { CatalogMatchResult, CatalogVariantRecord } from "../../../types";
import type { DuplicateDetectionReport } from "../../duplicate/duplicate-types";
import type { MediaPipelineReport } from "../../media/media-types";
import type { CatalogValidationReport } from "../../validation/validation-types";
import { runGaadiBazaarCatalogImport } from "../../catalog-import.service";
import type { ImportPipelineRunResult } from "../../import-pipeline";
import type { GaadiBazaarScraperPayload } from "./gaadi-bazaar-types";
import type { MediaDownloader } from "../../media/media-types";

export type GaadiBazaarImportPipelineResult = {
  pipeline: ImportPipelineRunResult;
  validation?: CatalogValidationReport;
  duplicates?: DuplicateDetectionReport;
  media?: MediaPipelineReport;
  matching?: CatalogMatchResult[];
};

export type GaadiBazaarImportPipelineOptions = {
  catalogVariants?: CatalogVariantRecord[];
  mediaDownloader?: MediaDownloader;
  runMedia?: boolean;
  skipMatching?: boolean;
};

/** @deprecated Use runGaadiBazaarCatalogImport — thin wrapper over unified pipeline. */
export async function runGaadiBazaarImportPipeline(
  payload: GaadiBazaarScraperPayload,
  options: GaadiBazaarImportPipelineOptions = {},
): Promise<GaadiBazaarImportPipelineResult> {
  const pipeline = await runGaadiBazaarCatalogImport(payload, {
    catalogVariants: options.catalogVariants,
    mediaDownloader: options.mediaDownloader,
    runMedia: options.runMedia,
    skipMatching: options.skipMatching,
  });

  return {
    pipeline,
    validation: pipeline.context.metadata.catalogValidationReport as CatalogValidationReport | undefined,
    duplicates: pipeline.context.metadata.catalogDuplicateReport as DuplicateDetectionReport | undefined,
    media: pipeline.context.media,
    matching: pipeline.context.matching?.results,
  };
}

export { runGaadiBazaarCatalogImport } from "../../catalog-import.service";
