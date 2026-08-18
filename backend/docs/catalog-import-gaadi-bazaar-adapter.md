# GaadiBazaar Source Adapter (Phase 4B)

Read-only GaadiBazaar source adapter for the catalog import platform. **Accepts scraper payload in memory** — no Playwright, no scraping, no external HTTP calls, no API, no UI, no database writes.

## Location

```
backend/src/lib/catalog/import/sources/gaadi-bazaar/
├── gaadi-bazaar-types.ts
├── gaadi-bazaar-mapper.ts
├── gaadi-bazaar.adapter.ts
├── gaadi-bazaar-import.pipeline.ts
├── fixtures/
│   ├── gaadi-bazaar-sample-input.json
│   └── gaadi-bazaar-sample-output.json
├── gaadi-bazaar.adapter.test.ts
└── index.ts
```

## Input (future scraper payload)

```typescript
type GaadiBazaarScraperPayload = {
  vehicles: Array<{
    vehicleTitle?: string;
    brand?: string;
    model?: string;
    variant?: string;
    fuel?: string;
    transmission?: string;
    price?: number | string;
    year?: number | string;
    city?: string;
    state?: string;
    imageUrls?: string[];
    imageUrl?: string;
    brochureUrl?: string;
    vehicleUrl?: string;
    sourceId?: string;
  }>;
  scrapedAt?: string;
  source?: string;
};
```

See `fixtures/gaadi-bazaar-sample-input.json`.

## Output

Normalized `ImportRecord[]` compatible with the Phase 3 import engine:

```typescript
type ImportRecord = {
  rowNumber: number;
  fields: Record<string, string | number | boolean | null>;
};
```

See `fixtures/gaadi-bazaar-sample-output.json`.

## Reused modules (no duplicated logic)

| Stage | Module |
|-------|--------|
| Field normalization | Phase 3B `buildStandardRecord` / `standardRecordToImportFields` |
| Validation | Phase 3C `validateCatalogImportRecords` |
| Duplicate detection | Phase 3D `detectDuplicatesFromImportRecords` |
| Media pipeline | Phase 3E `runMediaPipeline` (mock downloader — no HTTP) |
| Catalog matching | Phase 2B `createCatalogMatchingService` |

## Adapter lifecycle

```
connect (verify payload) → fetch (load payload) → validate (3C) → normalize (ImportRecord) → disconnect
```

Payload must be provided before `connect`:

```typescript
context.metadata.scraperPayload = payload;
// or
context.metadata.config = { payload };
```

## Usage

### Adapter only

```typescript
import {
  GaadiBazaarAdapter,
  createGaadiBazaarContext,
} from "@/lib/catalog/import/sources/gaadi-bazaar";
import { runAdapterLifecycle } from "@/lib/catalog/import/sources";

const context = createGaadiBazaarContext(scraperPayload, { dryRun: true });
const result = await runAdapterLifecycle(new GaadiBazaarAdapter(), context);
// context.records → ImportRecord[]
```

### Full import pipeline (validation + duplicate + media + matching)

```typescript
import { runGaadiBazaarImportPipeline } from "@/lib/catalog/import/sources/gaadi-bazaar";

const result = await runGaadiBazaarImportPipeline(scraperPayload, {
  catalogVariants: existingCatalogVariants,
});
// result.validation, result.duplicates, result.media, result.matching
```

## Field mapping

| Scraper field | Import field |
|---------------|--------------|
| brand, model, variant, fuel, transmission, year | Standard catalog fields (normalized) |
| price | exShowroomPrice |
| city, state | city, state |
| imageUrls[0] / imageUrl | imageUrl |
| imageUrls[1+] | images (pipe-separated) |
| brochureUrl | brochureUrl |
| vehicleTitle | description |
| sourceId / vehicleUrl | source_id |
| vehicleUrl | vehicleUrl (metadata) |

## Commands

```bash
cd backend
npm run test:catalog-import-gaadi-bazaar
npm run test:catalog-import-sources
```

## Constraints (Phase 4B)

- Read-only — scraper delivers JSON; adapter never calls GaadiBazaar URLs
- No Playwright, scheduler, API routes, or UI
- No database or existing catalog mutations
- GaadiBazaar is the **only** implemented source adapter in this phase

## Integration note

Register via Phase 4A `SourceRegistry` (default). Future scraper job passes `GaadiBazaarScraperPayload` into `createGaadiBazaarContext()` before running the lifecycle.
