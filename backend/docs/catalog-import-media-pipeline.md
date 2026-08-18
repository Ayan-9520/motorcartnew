# Catalog Import Media Pipeline (Phase 3E)

Internal media processing only. **No storage upload, no database writes, no API, no UI.**

## Location

```
backend/src/lib/catalog/import/media/
├── media-types.ts
├── media-url-validator.ts
├── media-downloader.ts
├── media-file-type.ts
├── media-image-dimensions.ts
├── media-hash.ts
├── media-pipeline.engine.ts
├── media-report.ts
├── catalog-media-input.ts
├── catalog-media-processor.ts
├── catalog-media.test.ts
└── index.ts
```

## Supported media

| Type | Source fields | Allowed formats |
|------|---------------|-----------------|
| Primary image | `imageUrl` | jpeg, png, gif, webp |
| Multiple images | `imageUrls`, `images`, `gallery` (pipe/comma/semicolon separated) | jpeg, png, gif, webp |
| Brochure | `brochureUrl` | pdf |
| Video | `videoUrl`, `video_url` | mp4, webm |

## Pipeline stages

```
Validate URL → Download → Verify file type → Verify image dimensions → Calculate SHA-256 hash → Detect duplicate images → Generate metadata → Media Report
```

All processing is **in-memory**. Nothing is uploaded to object storage or persisted.

## Output buckets

| Bucket | When |
|--------|------|
| **Valid Images** | Allowed format, readable dimensions within limits, unique hash |
| **Invalid Images** | Unreadable dimensions or below/above size limits |
| **Duplicate Images** | Same SHA-256 as an earlier valid image |
| **Broken URLs** | Invalid URL syntax or download/HTTP failure |
| **Unsupported Formats** | Detected format not allowed for media kind |

Brochures and videos are tracked as `validBrochures` / `validVideos` in the full report.

## Usage

### Direct pipeline

```typescript
import { runMediaPipeline, createFetchMediaDownloader } from "@/lib/catalog/import/media";

const report = await runMediaPipeline(inputs, createFetchMediaDownloader());
```

### Import records

```typescript
import { extractMediaFromImportRecords, runMediaPipeline, createMockMediaDownloader } from "@/lib/catalog/import/media";

const inputs = extractMediaFromImportRecords(importRecords);
const report = await runMediaPipeline(inputs, downloader);
```

### Import context (metadata only)

```typescript
import { runCatalogMediaPipeline } from "@/lib/catalog/import/media";

await runCatalogMediaPipeline(importContext, { downloader });
// context.metadata.catalogMediaReport → full report
```

### Reports (CSV / JSON)

```typescript
import { buildMediaReportBundle } from "@/lib/catalog/import/media";

const bundle = buildMediaReportBundle(report);
// bundle.itemsCsv, summaryCsv, json
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `timeoutMs` | 15000 | Download timeout |
| `maxDownloadBytes` | 10 MB | Max file size |
| `minImageWidth/Height` | 100 | Minimum image dimensions |
| `maxImageWidth/Height` | 10000 | Maximum image dimensions |

## Commands

```bash
cd backend
npm run test:catalog-import-media
npm run benchmark:catalog-import-media
npm run test:catalog   # includes media tests
```

## Testing

Unit tests use `createMockMediaDownloader()` with in-memory buffers — **no network calls**.

## Constraints (Phase 3E)

- No changes to homepage, routing, login, CRM, portals, admin UI
- No existing API or upload flow changes
- No DB schema or writes
- No object storage upload (deferred to a future phase)
