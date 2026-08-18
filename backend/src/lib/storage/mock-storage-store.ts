import { createHash } from "node:crypto";

export type StoredObject = {
  key: string;
  body: Buffer;
  contentType: string;
  metadata: Record<string, string>;
  uploadedAt: string;
  etag: string;
};

export class MockStorageStore {
  private readonly objects = new Map<string, StoredObject>();

  put(key: string, body: Buffer, contentType: string, metadata: Record<string, string> = {}): StoredObject {
    const stored: StoredObject = {
      key,
      body: Buffer.from(body),
      contentType,
      metadata: { ...metadata },
      uploadedAt: new Date().toISOString(),
      etag: createHash("sha256").update(body).digest("hex").slice(0, 32),
    };
    this.objects.set(key, stored);
    return stored;
  }

  get(key: string): StoredObject | undefined {
    return this.objects.get(key);
  }

  delete(key: string): boolean {
    return this.objects.delete(key);
  }

  has(key: string): boolean {
    return this.objects.has(key);
  }

  size(): number {
    return this.objects.size;
  }

  clear(): void {
    this.objects.clear();
  }
}
