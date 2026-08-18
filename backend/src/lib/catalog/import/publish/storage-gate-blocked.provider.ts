/**
 * Storage provider that refuses uploads when production storage is not configured.
 * Prevents silent fall-back to local disk for Phase 5G controlled imports.
 */
import {
  storageFailure,
  type DeleteRequest,
  type DownloadRequest,
  type SignedUrlOptions,
  type StorageConfig,
  type StorageProvider,
  type StorageResult,
  type UploadRequest,
  type UploadResultData,
  type DownloadResultData,
} from "../../../storage/storage-types";

export function createStorageGateBlockedProvider(options: {
  code: string;
  message: string;
}): StorageProvider {
  const config: StorageConfig = {
    provider: "cloudflare_r2",
    bucket: "unconfigured",
  };

  return {
    provider: "cloudflare_r2",
    config,
    async upload(_request: UploadRequest): Promise<StorageResult<UploadResultData>> {
      return storageFailure(options.code, options.message);
    },
    async download(_request: DownloadRequest): Promise<StorageResult<DownloadResultData>> {
      return storageFailure(options.code, options.message);
    },
    async delete(_request: DeleteRequest): Promise<StorageResult<{ deleted: boolean }>> {
      return storageFailure(options.code, options.message);
    },
    async exists(_key: string): Promise<StorageResult<boolean>> {
      return storageFailure(options.code, options.message);
    },
    getPublicUrl(_key: string): StorageResult<string> {
      return storageFailure(options.code, options.message);
    },
    async getSignedUrl(_key: string, _options?: SignedUrlOptions): Promise<StorageResult<string>> {
      return storageFailure(options.code, options.message);
    },
  };
}
