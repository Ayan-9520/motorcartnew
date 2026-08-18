import { MockStorageStore } from "../mock-storage-store";
import { validateMimeType, validateObjectKey, validateUploadSize } from "../storage-validation";
import {
  DEFAULT_STORAGE_CONFIG,
  storageFailure,
  storageSuccess,
  type DeleteRequest,
  type DownloadRequest,
  type DownloadResultData,
  type SignedUrlOptions,
  type StorageConfig,
  type StorageProvider,
  type StorageProviderKind,
  type StorageResult,
  type UploadRequest,
  type UploadResultData,
} from "../storage-types";

export abstract class BaseMockStorageProvider implements StorageProvider {
  readonly config: Readonly<StorageConfig>;
  protected readonly store: MockStorageStore;

  constructor(config: StorageConfig, store?: MockStorageStore) {
    this.config = Object.freeze({
      ...DEFAULT_STORAGE_CONFIG,
      ...config,
      allowedMimeTypes: config.allowedMimeTypes ?? DEFAULT_STORAGE_CONFIG.allowedMimeTypes,
    });
    this.store = store ?? new MockStorageStore();
  }

  abstract readonly provider: StorageProviderKind;

  abstract buildPublicUrl(key: string): string;
  abstract buildSignedUrl(key: string, expiresAt: number, method: "GET" | "PUT"): string;

  async upload(request: UploadRequest): Promise<StorageResult<UploadResultData>> {
    const keyCheck = validateObjectKey(request.key);
    if (!keyCheck.success) return keyCheck as StorageResult<UploadResultData>;

    const maxBytes = this.config.maxUploadBytes ?? DEFAULT_STORAGE_CONFIG.maxUploadBytes!;
    const sizeCheck = validateUploadSize(request.body.byteLength, maxBytes);
    if (!sizeCheck.valid) {
      return storageFailure(sizeCheck.errorCode, sizeCheck.errorMessage);
    }

    const allowed = this.config.allowedMimeTypes ?? DEFAULT_STORAGE_CONFIG.allowedMimeTypes!;
    const mimeCheck = validateMimeType(request.contentType, allowed);
    if (!mimeCheck.valid) {
      return storageFailure(mimeCheck.errorCode, mimeCheck.errorMessage);
    }

    const key = request.key.trim();
    const stored = this.store.put(key, request.body, mimeCheck.mime, request.metadata ?? {});
    const publicUrl = this.buildPublicUrl(key);

    return storageSuccess(
      {
        key,
        publicUrl,
        byteLength: stored.body.byteLength,
        contentType: stored.contentType,
        etag: stored.etag,
      },
      { mock: true, provider: this.provider },
    );
  }

  async download(request: DownloadRequest): Promise<StorageResult<DownloadResultData>> {
    const keyCheck = validateObjectKey(request.key);
    if (!keyCheck.success) return keyCheck as StorageResult<DownloadResultData>;

    const stored = this.store.get(request.key.trim());
    if (!stored) {
      return storageFailure("NOT_FOUND", `Object not found: ${request.key}`);
    }

    return storageSuccess(
      {
        key: stored.key,
        body: Buffer.from(stored.body),
        contentType: stored.contentType,
        byteLength: stored.body.byteLength,
        etag: stored.etag,
      },
      { mock: true, provider: this.provider },
    );
  }

  async delete(request: DeleteRequest): Promise<StorageResult<{ deleted: boolean }>> {
    const keyCheck = validateObjectKey(request.key);
    if (!keyCheck.success) return keyCheck as StorageResult<{ deleted: boolean }>;

    const deleted = this.store.delete(request.key.trim());
    if (!deleted) {
      return storageFailure("NOT_FOUND", `Object not found: ${request.key}`);
    }

    return storageSuccess({ deleted: true }, { mock: true, provider: this.provider });
  }

  async exists(key: string): Promise<StorageResult<boolean>> {
    const keyCheck = validateObjectKey(key);
    if (!keyCheck.success) return keyCheck as StorageResult<boolean>;
    return storageSuccess(this.store.has(key.trim()), { mock: true, provider: this.provider });
  }

  getPublicUrl(key: string): StorageResult<string> {
    const keyCheck = validateObjectKey(key);
    if (!keyCheck.success) return keyCheck as StorageResult<string>;
    return storageSuccess(this.buildPublicUrl(key.trim()), { mock: true, provider: this.provider });
  }

  async getSignedUrl(key: string, options: SignedUrlOptions = {}): Promise<StorageResult<string>> {
    const keyCheck = validateObjectKey(key);
    if (!keyCheck.success) return keyCheck as StorageResult<string>;

    const trimmed = key.trim();
    if (!this.store.has(trimmed)) {
      return storageFailure("NOT_FOUND", `Object not found: ${key}`);
    }

    const ttl = options.expiresInSeconds ?? this.config.signedUrlTtlSeconds ?? DEFAULT_STORAGE_CONFIG.signedUrlTtlSeconds!;
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    const method = options.method ?? "GET";
    const url = this.buildSignedUrl(trimmed, expiresAt, method);

    return storageSuccess(url, {
      mock: true,
      provider: this.provider,
      expiresAt,
      method,
    });
  }
}
