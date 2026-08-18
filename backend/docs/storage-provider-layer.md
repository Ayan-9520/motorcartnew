# Storage Provider Layer (Phase 3F)

Pluggable object storage abstraction for catalog media and future import publish flows. **Mock implementation only** — no real uploads, no API routes, no database writes.

## Location

```
backend/src/lib/storage/
├── storage-types.ts
├── storage-validation.ts
├── mock-storage-store.ts
├── storage-factory.ts
├── storage-provider.test.ts
├── providers/
│   ├── base-mock.provider.ts
│   ├── local.provider.ts
│   ├── cloudflare-r2.provider.ts
│   ├── s3.provider.ts
│   ├── future.providers.ts
│   └── index.ts
└── index.ts
```

## Interfaces

| Type | Purpose |
|------|---------|
| `StorageProvider` | Upload, download, delete, exists, public URL, signed URL |
| `StorageResult<T>` | Success/failure envelope with optional metadata |
| `StorageConfig` | Provider kind, bucket, region, limits, MIME allowlist |
| `UploadRequest` | key, body, contentType, metadata |
| `DownloadRequest` | key |
| `DeleteRequest` | key |

## Providers

| Provider | Status | Notes |
|----------|--------|-------|
| `LocalProvider` | Mock (dev only) | In-memory; `file://` style URLs |
| `CloudflareR2Provider` | Mock | R2-style public/signed URL shape |
| `S3Provider` | Mock | Virtual-hosted S3 URL shape |
| `AzureBlobProvider` | Future stub | Returns `NOT_IMPLEMENTED` |
| `GoogleCloudStorageProvider` | Future stub | Returns `NOT_IMPLEMENTED` |

## Features

- **Upload** — validates key, MIME, size; stores in memory
- **Download** — returns buffer + metadata
- **Delete** — removes from mock store
- **Exists** — checks mock store
- **Generate Public URL** — provider-specific URL format
- **Generate Signed URL** — mock query-string signatures
- **Validate MIME** — configurable allowlist
- **Validate Size** — configurable max bytes (default 10 MB)

## Usage

```typescript
import { createStorageProvider } from "@/lib/storage";

const storage = createStorageProvider({
  provider: "cloudflare_r2",
  bucket: "motorcart-catalog",
  accountId: "your-account-id",
  maxUploadBytes: 5 * 1024 * 1024,
});

const result = await storage.upload({
  key: "vehicles/creta/front.jpg",
  body: imageBuffer,
  contentType: "image/jpeg",
});

if (result.success) {
  console.log(result.data.publicUrl, result.data.etag);
}
```

### Factory

```typescript
import { createStorageProvider, isMockStorageProvider, isFutureStorageProvider } from "@/lib/storage";

const s3 = createStorageProvider({ provider: "aws_s3", bucket: "motorcart-prod", region: "ap-south-1" });
```

## Default MIME allowlist

`image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`, `video/mp4`, `video/webm`

## Commands

```bash
cd backend
npm run test:storage-provider
npm run benchmark:storage-provider
```

## Constraints (Phase 3F)

- Mock/in-memory only — no disk writes, no cloud SDK calls
- No homepage, routing, login, CRM, portals, admin UI changes
- No existing API or upload flow changes
- No database schema or writes
- Real R2/S3/Azure/GCS integration deferred to a future phase

## Integration note

Phase 3E (Media Pipeline) processes URLs in memory. This layer provides the storage adapter that a future publish phase can call after media validation — not wired automatically in 3F.
