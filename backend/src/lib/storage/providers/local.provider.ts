import { MockStorageStore } from "../mock-storage-store";
import type { StorageConfig } from "../storage-types";
import { BaseMockStorageProvider } from "./base-mock.provider";

/** Local mock provider — development only, in-memory (no disk writes). */
export class LocalProvider extends BaseMockStorageProvider {
  readonly provider = "local" as const;

  constructor(config: Omit<StorageConfig, "provider"> & { provider?: "local" }, store?: MockStorageStore) {
    super({ ...config, provider: "local" }, store);
  }

  buildPublicUrl(key: string): string {
    if (this.config.publicBaseUrl) {
      return `${this.config.publicBaseUrl.replace(/\/$/, "")}/${key}`;
    }
    const root = this.config.localRootPath ?? "/tmp/motorcart-storage";
    return `file://${root}/${this.config.bucket}/${key}`;
  }

  buildSignedUrl(key: string, expiresAt: number, method: "GET" | "PUT"): string {
    const base = this.buildPublicUrl(key);
    return `${base}?mock-signed=1&provider=local&method=${method}&expires=${expiresAt}&sig=mock-local`;
  }
}
