import type { CatalogVariantRecord } from "../types";
import type { StorageProvider } from "../../storage/storage-types";
import type { ImportContext } from "./import-context";
import type {
  ImportPublishReport,
  ImportRecord,
  ImportResult,
  ImportSourceType,
  ImportUploadPayload,
  ImportValidationReport,
} from "./import-types";
import type { MediaDownloader } from "./media/media-types";
import type { SourceAdapter } from "./sources/source-adapter";

/** Fetches or receives raw catalog import payload (Phase 3A — interface only). */
export interface ImportSource {
  readonly type: ImportSourceType;
  upload(context: ImportContext): Promise<ImportResult<ImportUploadPayload>>;
}

/** Parses raw upload payload into catalog import records (Phase 3B+). */
export interface ImportParser {
  readonly supportedSources: readonly ImportSourceType[];
  parse(context: ImportContext): Promise<ImportResult<ImportRecord[]>>;
}

/** Validates parsed/normalized import records (Phase 3B+). */
export interface ImportValidator {
  validate(context: ImportContext): Promise<ImportResult<ImportValidationReport>>;
}

/** Publishes approved records to the catalog layer (Phase 3C+ — no writes in 3A). */
export interface ImportPublisher {
  publish(context: ImportContext): Promise<ImportResult<ImportPublishReport>>;
}

export type ImportPipelineDependencies = {
  source: ImportSource;
  parser?: ImportParser;
  validator?: ImportValidator;
  publisher?: ImportPublisher;
  sourceAdapter?: SourceAdapter;
  catalogVariants?: CatalogVariantRecord[];
  mediaDownloader?: MediaDownloader;
  storageProvider?: StorageProvider;
};
