# Phase 4F — End-to-End Catalog Import Pipeline Integration

Connects existing modules into one production **dry-run** job entry point. No database writes, no publish, no frontend, no API routes.

## Entry point

```typescript
import { runCatalogImportJob } from "./lib/catalog/import/catalog-import-job.service";

const result = await runCatalogImportJob({
  source: "gaadi_bazaar",
  city: "Mumbai",
  search: "creta",
  pages: 1,
});
```

### Input (`CatalogImportJobInput`)

| Field | Type | Description |
|-------|------|-------------|
| `source` | `"gaadi_bazaar"` | Import source (extensible later) |
| `city` | `string?` | City filter passed to scraper |
| `search` | `string?` | Search query passed to scraper |
| `pages` | `number?` | Max listing pages (default `1`) |
| `segment` | `string?` | Vehicle segment hint |
| `jobId` | `string?` | Optional job identifier |
| `catalogVariants` | `CatalogVariantRecord[]?` | Enables matching stage |
| `usePlaywrightWorker` | `boolean?` | Default `true`; `false` uses fixture navigation only |

### Output (`CatalogImportJobResult`)

- `jobId` — unique job identifier
- `success` — overall job success
- `payload` — `GaadiBazaarScraperPayload` from scraper
- `scrapeErrors` — scraper-level errors
- `pipeline` — full `ImportPipelineRunResult` (dry-run)
- `report` — execution report (see below)

## Pipeline (reuse only — no rewrites)

```
Playwright Worker
  ↓
GaadiBazaar Scraper          (Phase 4E)
  ↓
GaadiBazaar Adapter           (existing GaadiBazaarAdapter via runGaadiBazaarCatalogImport)
  ↓
Validation                    (ImportPipeline)
  ↓
Normalization
  ↓
Duplicate Detection
  ↓
Media Pipeline
  ↓
Matching
  ↓
Approval
  ↓
Storage (mock)
  ↓
Preview (dry-run)
```

Publish is skipped (`dryRun: true`). Existing stage order in `import-pipeline.ts` is preserved (media runs before matching/approval).

## Execution report

`result.report` includes:

| Section | Contents |
|---------|----------|
| `stages` | Per-stage timings (`startedAt`, `finishedAt`, `durationMs`, `success`) |
| `scrapeStats` | Listing pages, cards seen, vehicles extracted |
| `importSummary` | Record counts, duplicates, matching, approval, storage, preview |
| `errorSummary` | Scrape + import errors grouped by code |
| `performance` | Total/worker/scraper/import ms, records/sec |

## Files

| File | Role |
|------|------|
| `catalog-import-job.service.ts` | `runCatalogImportJob()` orchestrator |
| `catalog-import-job.types.ts` | Job input/output/report types |
| `catalog-import-job-report.ts` | Report builders |
| `catalog-import-job.test.ts` | Unit tests |

Scraper additions (minimal, no rewrite):

| File | Role |
|------|------|
| `worker-mock-pages.ts` | Register fixture HTML with Playwright mock driver |
| `worker-navigation.ts` | `createWorkerScraperSessionBundle()`, pagination helpers |

## Tests

```bash
npm run test:catalog-import-job
```

Fixture path (`usePlaywrightWorker: false`) and Playwright Worker mock path are both covered.

## Constraints (Phase 4F)

- Does **not** modify homepage, routing, login, CRM, portals, admin UI
- Does **not** add API routes or database writes
- Reuses `runGaadiBazaarCatalogImport`, `scrapeGaadiBazaarPayload`, `PlaywrightWorker`, POM, adapter, and import pipeline as-is
