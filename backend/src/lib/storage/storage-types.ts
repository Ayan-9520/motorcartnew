/** Storage provider layer types (Phase 3F — mock only). */

export type StorageProviderKind =
  | "local"
  | "cloudflare_r2"
  | "aws_s3"
  | "azure_blob"
  | "google_cloud_storage";

export type StorageError = {
  code: string;
  message: string;
};

export type StorageResult<T = void> =
  | {
      success: true;
      data: T;
      metadata?: Record<string, unknown>;
    }
  | {
      success: false;
      error: StorageError;
      metadata?: Record<string, unknown>;
    };

export type StorageConfig = {
  provider: StorageProviderKind;
  bucket: string;
  region?: string;
  endpoint?: string;
  accountId?: string;
  publicBaseUrl?: string;
  signedUrlTtlSeconds?: number;
  maxUploadBytes?: number;
  allowedMimeTypes?: readonly string[];
  /** Mock local root path label (development only — no disk writes). */
  localRootPath?: string;
};

export type UploadRequest = {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
};

export type DownloadRequest = {
  key: string;
};

export type DeleteRequest = {
  key: string;
};

export type UploadResultData = {
  key: string;
  publicUrl: string;
  byteLength: number;
  contentType: string;
  etag: string;
};

export type DownloadResultData = {
  key: string;
  body: Buffer;
  contentType: string;
  byteLength: number;
  etag: string;
};

export type SignedUrlOptions = {
  expiresInSeconds?: number;
  method?: "GET" | "PUT";
};

/** Pluggable object storage provider (mock implementation in Phase 3F). */
export interface StorageProvider {
  readonly provider: StorageProviderKind;
  readonly config: Readonly<StorageConfig>;

  upload(request: UploadRequest): Promise<StorageResult<UploadResultData>>;
  download(request: DownloadRequest): Promise<StorageResult<DownloadResultData>>;
  delete(request: DeleteRequest): Promise<StorageResult<{ deleted: boolean }>>;
  exists(key: string): Promise<StorageResult<boolean>>;
  getPublicUrl(key: string): StorageResult<string>;
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<StorageResult<string>>;
}

export const DEFAULT_STORAGE_CONFIG: Pick<
  StorageConfig,
  "maxUploadBytes" | "allowedMimeTypes" | "signedUrlTtlSeconds"
> = {
  maxUploadBytes: 10 * 1024 * 1024,
  signedUrlTtlSeconds: 3600,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "video/mp4",
    "video/webm",
  ],
};

export function storageSuccess<T>(data: T, metadata?: Record<string, unknown>): StorageResult<T> {
  return { success: true, data, metadata };
}

export function storageFailure<T = never>(
  code: string,
  message: string,
  metadata?: Record<string, unknown>,
): StorageResult<T> {
  return { success: false, error: { code, message }, metadata };
}
