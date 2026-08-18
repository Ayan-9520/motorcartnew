import { MockStorageStore } from "../mock-storage-store";
import type { StorageConfig } from "../storage-types";
import { BaseMockStorageProvider } from "./base-mock.provider";

/** AWS S3 mock provider — no real S3 API calls. */
export class S3Provider extends BaseMockStorageProvider {
  readonly provider = "aws_s3" as const;

  constructor(config: Omit<StorageConfig, "provider"> & { provider?: "aws_s3" }, store?: MockStorageStore) {
    super({ ...config, provider: "aws_s3" }, store);
  }

  buildPublicUrl(key: string): string {
    if (this.config.publicBaseUrl) {
      return `${this.config.publicBaseUrl.replace(/\/$/, "")}/${key}`;
    }
    const region = this.config.region ?? "ap-south-1";
    return `https://${this.config.bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  buildSignedUrl(key: string, expiresAt: number, method: "GET" | "PUT"): string {
    const base = this.buildPublicUrl(key);
    return `${base}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${expiresAt}&X-Amz-SignedHeaders=host&X-Amz-Signature=mock-s3&method=${method}`;
  }
}
