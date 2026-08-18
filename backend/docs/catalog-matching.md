# Catalog Matching Engine (Phase 2B)

Internal backend service only. **Not exposed via HTTP**, not used by frontend, and **never writes to the database**.

## Purpose

Given marketplace listing fields:

- Segment
- Brand
- Model
- Variant
- Fuel
- Transmission
- Model year

…return the best `catalog_variant_id` candidate with a **confidence score** and **match method**.

## Location

```
backend/src/lib/catalog/
├── types.ts
├── business-key.ts
├── normalization.ts
├── aliases.ts
├── fuzzy.ts
├── catalog-matching.service.ts
├── catalog-matching.test.ts
└── index.ts
```

## Matching priority

Matches are attempted in strict order; the first hit wins:

| Order | Method       | Confidence | Description |
|-------|--------------|------------|-------------|
| 1     | `exact`      | **100**    | Raw labels slugified into the business key (no normalization rules) |
| 2     | `normalized` | **95**     | Configurable normalization (brand/fuel/trans/variant cleanup) |
| 3     | `alias`      | **80**     | Brand/fuel/transmission alias map applied to normalized slugs |
| 4     | `fuzzy`      | **60**     | Same segment, brand, model, year, fuel, trans; variant slug similarity |
| 5     | `none`       | **0**      | No acceptable match |

## Business key format

Stable key (no timestamps):

```
{segment}|{brand_slug}|{model_slug}|{variant_slug}|{fuel_slug}|{transmission_slug}|{model_year}
```

Example:

```
car|hyundai|creta|sx-o-1-5-diesel-automatic|diesel|at|2025
```

Built by `buildCatalogBusinessKey()` in `business-key.ts`.

## Normalization

Configurable in `DEFAULT_NORMALIZATION_CONFIG` (`normalization.ts`):

| Field | Examples |
|-------|----------|
| Brand | `Maruti Suzuki` → `maruti`, `Hyundai Motor India` → `hyundai` |
| Fuel | `Petrol + CNG` → `petrol+cng`, `EV` → `electric` |
| Transmission | `Automatic` → `at`, `Manual` → `mt`, `AMT`/`CVT`/`DCT` → `at` |
| Variant | `(O)` → ` o` (token boundary), `+` → ` plus `, strip stop words (`bs6`, `edition`, …) |

Override by passing a custom `CatalogMatchingConfig` to `createCatalogMatchingService()`.

## Aliases

Configurable in `DEFAULT_ALIAS_CONFIG` (`aliases.ts`):

| Type | Examples |
|------|----------|
| Brand | `ms` → `maruti`, `maruti-suzuki` → `maruti`, `mb` → `mercedes-benz` |
| Fuel | `gasoline` → `petrol`, `cng` → `petrol+cng` |
| Transmission | `automatic` → `at`, `manual` → `mt` |

Aliases apply **after** normalization, when building the alias business key for lookup.

## Fuzzy matching

When exact/normalized/alias keys miss:

1. Filter catalog index by segment, model year, brand, model, fuel, transmission.
2. Score variant slug similarity using Levenshtein ratio and token-set ratio (`fuzzy.ts`).
3. Accept if score ≥ `fuzzyMinScore` (default **0.72**).

## Usage (internal)

```typescript
import { createCatalogMatchingService } from "@/lib/catalog";
import type { CatalogVariantRecord } from "@/lib/catalog";

// Build in-memory index from catalog rows (read-only; caller loads from DB if needed)
const variants: CatalogVariantRecord[] = [/* ... */];
const matcher = createCatalogMatchingService(variants);

const result = matcher.match({
  segment: "car",
  brand: "Maruti Suzuki",
  model: "Swift",
  variant: "VXI",
  fuel: "Petrol",
  transmission: "Manual",
  modelYear: 2025,
});

// result.catalogVariantId — string | null
// result.confidence — 100 | 95 | 80 | 60 | 0
// result.method — exact | normalized | alias | fuzzy | none
```

**Important:** This service **returns results only**. It does not update `vehicles` or `new_car_inventory`. Persistence is a separate Phase 2C+ concern.

## Tests

```bash
cd backend
npm run test:catalog-matching
```

Uses Node.js built-in test runner (`node:test`) via `tsx`.

## Benchmark

```bash
cd backend
npm run benchmark:catalog-matching
```

Runs **100,000** in-memory lookups against a **10,000** variant synthetic index and reports average, median, p95, p99, and max lookup times.

## Feature flags

`FEATURE_CATALOG_*` remain **OFF**. This module is not wired to routes or jobs until a later phase explicitly approves it.

## Phase boundaries

| Phase | Scope |
|-------|--------|
| 2A | Nullable `catalog_variant_id` FK columns |
| **2B** | Matching engine (this document) — read-only |
| 2C+ | Optional enrichment / admin review / controlled persistence (future) |
