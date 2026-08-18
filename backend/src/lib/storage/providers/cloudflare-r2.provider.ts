import { MockStorageStore } from "../mock-storage-store";
import type { StorageConfig } from "../storage-types";
import { BaseMockStorageProvider } from "./base-mock.provider";

/** Cloudflare R2 mock provider — no real R2 API calls. */
export class CloudflareR2Provider extends BaseMockStorageProvider {
  readonly provider = "cloudflare_r2" as const;

  constructor(
    config: Omit<StorageConfig, "provider"> & { provider?: "cloudflare_r2" },
    store?: MockStorageStore,
  ) {
    super({ ...config, provider: "cloudflare_r2" }, store);
  }

  buildPublicUrl(key: string): string {
    if (this.config.publicBaseUrl) {
      return `${this.config.publicBaseUrl.replace(/\/$/, "")}/${key}`;
    }
    const accountId = this.config.accountId ?? "mock-account";
    return `https://${accountId}.r2.cloudflarestorage.com/${this.config.bucket}/${key}`;
  }

  buildSignedUrl(key: string, expiresAt: number, method: "GET" | "PUT"): string {
    const base = this.buildPublicUrl(key);
    return `${base}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${expiresAt}&X-Amz-SignedHeaders=host&X-Amz-Signature=mock-r2&method=${method}`;
  }
}
