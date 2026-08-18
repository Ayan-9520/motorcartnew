import type { ImportContext } from "../import-context";
import type { ImportRecord } from "../import-types";
import { extractMediaFromImportRecords } from "./catalog-media-input";
import { createFetchMediaDownloader } from "./media-downloader";
import { runMediaPipeline } from "./media-pipeline.engine";
import type { MediaDownloader, MediaPipelineConfig, MediaPipelineReport } from "./media-types";

/** Runs media pipeline against import context records (read-only, in-memory). */
export async function runCatalogMediaPipeline(
  context: ImportContext,
  options?: {
    downloader?: MediaDownloader;
    config?: Partial<MediaPipelineConfig>;
    records?: ImportRecord[];
  },
): Promise<MediaPipelineReport> {
  const records = options?.records ?? (context.normalizedRecords.length ? [...context.normalizedRecords] : [...context.records]);
  const inputs = extractMediaFromImportRecords(records);
  const downloader = options?.downloader ?? createFetchMediaDownloader();
  const report = await runMediaPipeline(inputs, downloader, options?.config);
  context.metadata.catalogMediaReport = report;
  return report;
}
