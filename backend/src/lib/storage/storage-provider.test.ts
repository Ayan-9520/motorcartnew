import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createStorageProvider, isFutureStorageProvider, isMockStorageProvider } from "./storage-factory";
import {
  CloudflareR2Provider,
  LocalProvider,
  S3Provider,
} from "./providers";
import { validateMimeType, validateObjectKey, validateUploadSize } from "./storage-validation";
import { AzureBlobProvider, GoogleCloudStorageProvider } from "./providers/future.providers";

const sampleBody = Buffer.from("mock-image-bytes");

describe("storage validation", () => {
  it("validates allowed MIME types", () => {
    const ok = validateMimeType("image/png", ["image/png", "image/jpeg"]);
    assert.equal(ok.valid, true);
    const bad = validateMimeType("text/plain", ["image/png"]);
    assert.equal(bad.valid, false);
    if (!bad.valid) assert.equal(bad.errorCode, "MIME_NOT_ALLOWED");
  });

  it("validates upload size limits", () => {
    const ok = validateUploadSize(1024, 2048);
    assert.equal(ok.valid, true);
    const bad = validateUploadSize(4096, 2048);
    assert.equal(bad.valid, false);
    if (!bad.valid) assert.equal(bad.errorCode, "FILE_TOO_LARGE");
  });

  it("rejects invalid object keys", () => {
    const bad = validateObjectKey("../secrets");
    assert.equal(bad.success, false);
    if (!bad.success) assert.equal(bad.error.code, "KEY_INVALID");
  });
});

describe("LocalProvider (mock)", () => {
  const provider = new LocalProvider({
    bucket: "catalog-media",
    localRootPath: "/tmp/motorcart-dev",
  });

  it("uploads, downloads, and deletes in memory", async () => {
    const upload = await provider.upload({
      key: "vehicles/creta/front.jpg",
      body: sampleBody,
      contentType: "image/jpeg",
    });
    assert.equal(upload.success, true);
    if (!upload.success) return;

    assert.ok(upload.data.publicUrl.includes("file://"));
    assert.equal(upload.data.byteLength, sampleBody.byteLength);

    const exists = await provider.exists("vehicles/creta/front.jpg");
    assert.equal(exists.success, true);
    if (exists.success) assert.equal(exists.data, true);

    const download = await provider.download({ key: "vehicles/creta/front.jpg" });
    assert.equal(download.success, true);
    if (download.success) assert.equal(download.data.body.toString(), sampleBody.toString());

    const del = await provider.delete({ key: "vehicles/creta/front.jpg" });
    assert.equal(del.success, true);

    const missing = await provider.download({ key: "vehicles/creta/front.jpg" });
    assert.equal(missing.success, false);
  });

  it("rejects disallowed MIME types", async () => {
    const result = await provider.upload({
      key: "bad.txt",
      body: Buffer.from("x"),
      contentType: "text/plain",
    });
    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.error.code, "MIME_NOT_ALLOWED");
  });

  it("generates mock signed URLs for existing objects", async () => {
    await provider.upload({ key: "signed.jpg", body: sampleBody, contentType: "image/jpeg" });
    const signed = await provider.getSignedUrl("signed.jpg", { expiresInSeconds: 600 });
    assert.equal(signed.success, true);
    if (signed.success) {
      assert.ok(signed.data.includes("mock-signed=1"));
      assert.ok(signed.data.includes("expires="));
    }
  });
});

describe("CloudflareR2Provider (mock)", () => {
  const provider = new CloudflareR2Provider({
    bucket: "motorcart-catalog",
    accountId: "acc-123",
  });

  it("builds R2-style public URLs", async () => {
    const upload = await provider.upload({
      key: "catalog/nexon.png",
      body: sampleBody,
      contentType: "image/png",
    });
    assert.equal(upload.success, true);
    if (upload.success) {
      assert.ok(upload.data.publicUrl.includes("r2.cloudflarestorage.com"));
      assert.ok(upload.data.publicUrl.includes("acc-123"));
    }

    const publicUrl = provider.getPublicUrl("catalog/nexon.png");
    assert.equal(publicUrl.success, true);
  });

  it("builds R2-style signed URLs", async () => {
    await provider.upload({ key: "a.pdf", body: sampleBody, contentType: "application/pdf" });
    const signed = await provider.getSignedUrl("a.pdf");
    assert.equal(signed.success, true);
    if (signed.success) assert.ok(signed.data.includes("mock-r2"));
  });
});

describe("S3Provider (mock)", () => {
  const provider = new S3Provider({
    bucket: "motorcart-prod",
    region: "ap-south-1",
    publicBaseUrl: "https://cdn.motorcart.in",
  });

  it("uses custom public base URL when configured", async () => {
    const upload = await provider.upload({
      key: "media/swift.jpg",
      body: sampleBody,
      contentType: "image/jpeg",
    });
    assert.equal(upload.success, true);
    if (upload.success) assert.equal(upload.data.publicUrl, "https://cdn.motorcart.in/media/swift.jpg");
  });

  it("falls back to virtual-hosted S3 URL", () => {
    const fallback = new S3Provider({ bucket: "motorcart-prod", region: "ap-south-1" });
    const url = fallback.getPublicUrl("media/swift.jpg");
    assert.equal(url.success, true);
    if (url.success) assert.ok(url.data.includes("motorcart-prod.s3.ap-south-1.amazonaws.com"));
  });
});

describe("createStorageProvider factory", () => {
  it("creates mock providers by kind", () => {
    const local = createStorageProvider({ provider: "local", bucket: "dev" });
    const r2 = createStorageProvider({ provider: "cloudflare_r2", bucket: "b", accountId: "a" });
    const s3 = createStorageProvider({ provider: "aws_s3", bucket: "b", region: "ap-south-1" });
    assert.equal(local.provider, "local");
    assert.equal(r2.provider, "cloudflare_r2");
    assert.equal(s3.provider, "aws_s3");
    assert.equal(isMockStorageProvider("local"), true);
    assert.equal(isFutureStorageProvider("azure_blob"), true);
  });

  it("returns NOT_IMPLEMENTED for future providers", async () => {
    const azure = createStorageProvider({ provider: "azure_blob", bucket: "b" });
    const gcs = createStorageProvider({ provider: "google_cloud_storage", bucket: "b" });
    const upload = await azure.upload({ key: "x", body: sampleBody, contentType: "image/png" });
    assert.equal(upload.success, false);
    if (!upload.success) assert.equal(upload.error.code, "NOT_IMPLEMENTED");
    const gcsUrl = gcs.getPublicUrl("x");
    assert.equal(gcsUrl.success, false);
  });
});

describe("no real storage side effects", () => {
  it("uses in-memory mock store only", async () => {
    const provider = new LocalProvider({ bucket: "dev" });
    await provider.upload({ key: "test.jpg", body: sampleBody, contentType: "image/jpeg" });
    const exists = await provider.exists("test.jpg");
    assert.equal(exists.success, true);
    if (exists.success) assert.equal(exists.data, true);
  });

  it("future provider classes are placeholders", () => {
    assert.equal(new AzureBlobProvider({ provider: "azure_blob", bucket: "x" }).provider, "azure_blob");
    assert.equal(
      new GoogleCloudStorageProvider({ provider: "google_cloud_storage", bucket: "x" }).provider,
      "google_cloud_storage",
    );
  });
});
