# Catalog Linking Service (Phase 2C)

Internal backend service only. **Dry run — no database writes**, no HTTP routes, no UI, no background jobs.

## Purpose

Analyze existing marketplace listings (`vehicles`, `new_car_inventory`) against the Phase 2B Catalog Matching Engine and produce a **read-only linking report** with match status, confidence, business key, and reason for each row.

## Location

```
backend/src/lib/catalog/
├── linking-types.ts
├── segment-inference.ts
├── listing-mapper.ts
├── catalog-linking.service.ts
├── catalog-linking.loader.ts
├── linking-report.ts
└── catalog-linking.test.ts

backend/scripts/catalog-linking-dry-run.ts
backend/reports/catalog-linking/          ← generated output (gitignored)
```

## Inputs

| Source | Prisma model | Fields used |
|--------|--------------|-------------|
| Used / marketplace listings | `vehicles` | brand, model, variant, fuel_type, transmission, year, category |
| New car dealer inventory | `new_car_inventory` | brand, model, variant, fuel_type, transmission, year |

Soft-deleted vehicles (`deleted_at IS NOT NULL`) are excluded.

Catalog variants are loaded from `catalog_variants` (+ brand/model joins) to build the in-memory matching index.

## Output per listing

| Field | Description |
|-------|-------------|
| `listingId` | Vehicle or inventory UUID |
| `source` | `vehicles` or `new_car_inventory` |
| `brand`, `model`, `variant` | Listing labels |
| `matchStatus` | See statuses below |
| `confidence` | 100, 95, 80, 60, or 0 |
| `catalogVariantId` | Best match ID (null if ambiguous or no match) |
| `businessKey` | Matched catalog business key |
| `reason` | Human-readable explanation |

## Match statuses

| Status | When |
|--------|------|
| `MATCHED` | Single candidate with confidence ≥ 80 (exact, normalized, or alias) |
| `LOW_CONFIDENCE` | Single fuzzy match only (confidence 60) |
| `MULTIPLE_MATCHES` | Two or more catalog variants tied at the best match tier |
| `NO_MATCH` | No acceptable catalog variant |

## Summary block

The report includes:

- Total listings
- Matched / Multiple / Low confidence / No match counts
- Per-source breakdown (`vehicles`, `new_car_inventory`)

## Report formats

### JSON

Full envelope:

```json
{
  "generatedAt": "2026-08-05T…",
  "dryRun": true,
  "summary": { … },
  "rows": [ … ]
}
```

### CSV

Columns: `listing_id`, `source`, `brand`, `model`, `variant`, `match_status`, `confidence`, `catalog_variant_id`, `business_key`, `match_method`, `reason`, `candidate_variant_ids`

## Usage (internal)

### Programmatic (in-memory)

```typescript
import {
  createCatalogMatchingService,
  createCatalogLinkingService,
  catalogLinkReportToCsv,
  catalogLinkReportToJson,
} from "@/lib/catalog";

const matcher = createCatalogMatchingService(catalogVariants);
const linker = createCatalogLinkingService(matcher);
const report = linker.buildReport(listings);

const csv = catalogLinkReportToCsv(report);
const json = catalogLinkReportToJson(report);
```

### Dry-run CLI (reads DB, writes reports only)

```bash
cd backend
npm run catalog:linking:dry-run
```

Writes timestamped `.json` and `.csv` files under `backend/reports/catalog-linking/`.

**Does not** set `catalog_variant_id` on any row.

## Segment inference

Marketplace `category` on vehicles maps to catalog segment (default `car`):

| Category | Segment |
|----------|---------|
| `cars`, `used-cars`, `new-cars` | `car` |
| `bikes` | `bike` |
| `trucks` | `truck` |
| … | … |

New car inventory rows use segment `car`.

## Safety guarantees

| Rule | Enforced |
|------|----------|
| No DB writes | Service + loader are read-only |
| No `catalog_variant_id` updates | Dry-run script only writes report files |
| No HTTP API | Not registered in Next/Express routes |
| No UI / admin page | None |
| No background jobs | CLI is manual/on-demand only |
| No Prisma schema changes | Phase 2C adds no migrations |

## Benchmark

In-memory analysis (no DB):

```bash
cd backend
npm run benchmark:catalog-linking
```

Dry-run CLI also prints total analysis time when the database is available.

## Tests

```bash
cd backend
npm run test:catalog-linking
# or both catalog test suites:
npm run test:catalog
```

## Phase boundaries

| Phase | Scope |
|-------|--------|
| 2B | Matching engine |
| **2C** | Linking dry-run + reports (this document) |
| 2D+ | Controlled persistence / enrichment (future, requires approval) |
