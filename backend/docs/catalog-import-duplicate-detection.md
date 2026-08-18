# Catalog Import Duplicate Detection Engine (Phase 3D)

Internal duplicate detection only. **No database writes, no API, no UI, no publishing.**

## Location

```
backend/src/lib/catalog/import/duplicate/
├── duplicate-types.ts
├── duplicate-fingerprints.ts
├── duplicate-detection.engine.ts
├── duplicate-report.ts
├── catalog-duplicate-detector.ts
├── catalog-duplicate.test.ts
└── index.ts
```

## Detection signals

| Signal | Fields | Classification |
|--------|--------|----------------|
| `business_key` | segment, brand, model, variant, fuel, transmission, year (Phase 2B key) | **DUPLICATE** |
| `source_id` | `sourceId` / `source_id` / `externalId` | **DUPLICATE** |
| `attributes_price` | brand, model, variant, fuel, transmission, year, ex/on-road price | **DUPLICATE** |
| `attributes` | brand, model, variant, fuel, transmission, year (price excluded) | **POSSIBLE_DUPLICATE** |
| `image_url` | normalized image URL | **POSSIBLE_DUPLICATE** |

Per-row classification uses the strongest signal: **DUPLICATE** > **POSSIBLE_DUPLICATE** > **UNIQUE**.

## Output

```typescript
type DuplicateDetectionReport = {
  checked: true;
  results: DuplicateRecordResult[];      // per-row classification
  groups: DuplicateGroup[];              // duplicate clusters by signal
  mergeRecommendations: MergeRecommendation[];
  summary: {
    totalRecords, duplicateCount, possibleDuplicateCount, uniqueCount,
    groupCount, bySignal
  };
};
```

### Merge recommendations

| Kind | When | Priority |
|------|------|----------|
| `MERGE_DUPLICATE` | Exact duplicate groups | high |
| `REVIEW_POSSIBLE_DUPLICATE` | Image URL or attribute-only overlap | medium |

## Usage

### Direct detection

```typescript
import { detectCatalogDuplicates } from "@/lib/catalog/import/duplicate";

const report = detectCatalogDuplicates(parsedRecords);
```

### Import records (pipeline shape)

```typescript
import { detectDuplicatesFromImportRecords } from "@/lib/catalog/import/duplicate";

const report = detectDuplicatesFromImportRecords(context.records);
```

### Phase 3A pipeline (wired in `duplicate_check` stage)

```typescript
import { runDuplicateDetection } from "@/lib/catalog/import/duplicate";

runDuplicateDetection(importContext);
// context.duplicates → ImportDuplicateReport
// context.metadata.catalogDuplicateReport → full DuplicateDetectionReport
```

### Reports (CSV / JSON)

```typescript
import { buildDuplicateReportBundle } from "@/lib/catalog/import/duplicate";

const bundle = buildDuplicateReportBundle(report);
// bundle.groupsCsv, resultsCsv, mergeCsv, json
```

## Commands

```bash
cd backend
npm run test:catalog-import-duplicate
npm run benchmark:catalog-import-duplicate
npm run test:catalog   # includes duplicate tests
```

## Constraints (Phase 3D)

- In-memory only — no Prisma, no HTTP routes, no publish
- Extends `ImportDuplicateReport` additively for pipeline compatibility
- Reuses Phase 2B `buildCatalogBusinessKey` for business key signal
- Default segment: `car` (override via record `segment` field or config)

## Classification examples

| Scenario | Result |
|----------|--------|
| Identical brand/model/variant/fuel/trans/year | **DUPLICATE** (business key) |
| Same `source_id`, different variant label | **DUPLICATE** (source id) |
| Same attributes + same price, different city | **DUPLICATE** (attributes_price) |
| Same attributes, different segment | **POSSIBLE_DUPLICATE** (attributes) |
| Same image URL, different model | **POSSIBLE_DUPLICATE** (image_url) |
| No overlapping signals | **UNIQUE** |
