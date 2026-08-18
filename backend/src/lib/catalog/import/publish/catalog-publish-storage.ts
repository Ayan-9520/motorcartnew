import { createStorageProvider } from "../../../storage/storage-factory";
import type { StorageConfig, StorageProvider, StorageProviderKind } from "../../../storage/storage-types";

export type PublishStorageResolution =
  | { ok: true; provider: StorageProvider; config: StorageConfig }
  | { ok: false; code: string; message: string };

function readEnvProvider(): StorageProviderKind | null {
  const raw = (process.env.STORAGE_PROVIDER ?? process.env.CATALOG_STORAGE_PROVIDER ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return null;
  if (raw === "r2" || raw === "cloudflare_r2" || raw === "cloudflare-r2") return "cloudflare_r2";
  if (raw === "s3" || raw === "aws_s3" || raw === "aws-s3") return "aws_s3";
  if (raw === "local") return "local";
  return null;
}

/**
 * Resolve storage for catalog publish.
 * Production must use Cloudflare R2 or AWS S3 with a bucket configured.
 * Local/mock fails unless `allowMockStorage` is explicitly true (tests).
 */
export function resolveCatalogPublishStorage(options?: {
  allowMockStorage?: boolean;
  injected?: StorageProvider;
}): PublishStorageResolution {
  if (options?.injected) {
    return { ok: true, provider: options.injected, config: options.injected.config };
  }

  const providerKind = readEnvProvider();
  const bucket = (process.env.STORAGE_BUCKET ?? process.env.CATALOG_STORAGE_BUCKET ?? "").trim();

  if (!providerKind) {
    return {
      ok: false,
      code: "STORAGE_NOT_CONFIGURED",
      message:
        "Catalog publish requires STORAGE_PROVIDER=cloudflare_r2|aws_s3 and STORAGE_BUCKET. Refusing to publish without object storage.",
    };
  }

  if (providerKind === "local" && !options?.allowMockStorage) {
    return {
      ok: false,
      code: "STORAGE_LOCAL_FORBIDDEN",
      message: "Local disk storage is not allowed for catalog publish. Configure Cloudflare R2 or AWS S3.",
    };
  }

  if (!bucket) {
    return {
      ok: false,
      code: "STORAGE_BUCKET_MISSING",
      message: "STORAGE_BUCKET is required for catalog publish.",
    };
  }

  if (
    (providerKind === "cloudflare_r2" || providerKind === "aws_s3") &&
    !options?.allowMockStorage &&
    !(process.env.STORAGE_ACCESS_KEY_ID && process.env.STORAGE_SECRET_ACCESS_KEY)
  ) {
    // Current providers are still mock implementations; require explicit credentials env
    // so misconfigured production fails closed instead of silently "succeeding" with in-memory mock.
    return {
      ok: false,
      code: "STORAGE_CREDENTIALS_MISSING",
      message:
        "STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY are required for catalog publish. Refusing silent media loss.",
    };
  }

  const config: StorageConfig = {
    provider: providerKind,
    bucket,
    region: process.env.STORAGE_REGION ?? undefined,
    endpoint: process.env.STORAGE_ENDPOINT ?? undefined,
    accountId: process.env.STORAGE_ACCOUNT_ID ?? undefined,
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL ?? undefined,
  };

  return { ok: true, provider: createStorageProvider(config), config };
}
