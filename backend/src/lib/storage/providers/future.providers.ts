import {
  storageFailure,
  type DownloadResultData,
  type StorageConfig,
  type StorageProvider,
  type StorageResult,
  type UploadResultData,
} from "../storage-types";

/** Placeholder for Azure Blob Storage (future phase). */
export class AzureBlobProvider implements StorageProvider {
  readonly provider = "azure_blob" as const;
  readonly config: Readonly<StorageConfig>;

  constructor(config: StorageConfig) {
    this.config = Object.freeze({ ...config, provider: "azure_blob" });
  }

  private notImplemented<T>(): Promise<StorageResult<T>> {
    return Promise.resolve(
      storageFailure("NOT_IMPLEMENTED", "Azure Blob Storage provider is not implemented yet"),
    );
  }

  upload() {
    return this.notImplemented<UploadResultData>();
  }

  download() {
    return this.notImplemented<DownloadResultData>();
  }

  delete() {
    return this.notImplemented<{ deleted: boolean }>();
  }

  exists() {
    return this.notImplemented<boolean>();
  }

  getPublicUrl() {
    return storageFailure("NOT_IMPLEMENTED", "Azure Blob Storage provider is not implemented yet");
  }

  getSignedUrl() {
    return this.notImplemented<string>();
  }
}

/** Placeholder for Google Cloud Storage (future phase). */
export class GoogleCloudStorageProvider implements StorageProvider {
  readonly provider = "google_cloud_storage" as const;
  readonly config: Readonly<StorageConfig>;

  constructor(config: StorageConfig) {
    this.config = Object.freeze({ ...config, provider: "google_cloud_storage" });
  }

  private notImplemented<T>(): Promise<StorageResult<T>> {
    return Promise.resolve(
      storageFailure("NOT_IMPLEMENTED", "Google Cloud Storage provider is not implemented yet"),
    );
  }

  upload() {
    return this.notImplemented<UploadResultData>();
  }

  download() {
    return this.notImplemented<DownloadResultData>();
  }

  delete() {
    return this.notImplemented<{ deleted: boolean }>();
  }

  exists() {
    return this.notImplemented<boolean>();
  }

  getPublicUrl() {
    return storageFailure("NOT_IMPLEMENTED", "Google Cloud Storage provider is not implemented yet");
  }

  getSignedUrl() {
    return this.notImplemented<string>();
  }
}
