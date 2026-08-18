import {
  AzureBlobProvider,
  CloudflareR2Provider,
  GoogleCloudStorageProvider,
  LocalProvider,
  S3Provider,
} from "./providers";
import type { StorageConfig, StorageProvider, StorageProviderKind } from "./storage-types";

export function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case "local":
      return new LocalProvider({ ...config, provider: "local" });
    case "cloudflare_r2":
      return new CloudflareR2Provider({ ...config, provider: "cloudflare_r2" });
    case "aws_s3":
      return new S3Provider({ ...config, provider: "aws_s3" });
    case "azure_blob":
      return new AzureBlobProvider(config);
    case "google_cloud_storage":
      return new GoogleCloudStorageProvider(config);
    default:
      throw new Error(`Unsupported storage provider: ${config.provider satisfies never}`);
  }
}

export function isMockStorageProvider(kind: StorageProviderKind): boolean {
  return kind === "local" || kind === "cloudflare_r2" || kind === "aws_s3";
}

export function isFutureStorageProvider(kind: StorageProviderKind): boolean {
  return kind === "azure_blob" || kind === "google_cloud_storage";
}
