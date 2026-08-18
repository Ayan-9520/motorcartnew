# Catalog Import Validation Engine (Phase 3C)

Internal validation only. **No database writes, no API, no UI, no publishing.**

## Location

```
backend/src/lib/catalog/import/validation/
├── validation-types.ts
├── validation-config.ts
├── validation-rules.ts
├── catalog-validation.engine.ts
├── catalog-import-validator.ts
└── catalog-validation.test.ts

backend/src/lib/catalog/import/samples/sample-invalid-catalog.csv
```

## Validation rules

### Required fields

brand, model, variant, fuel, transmission, year

### Field checks

| Field | Rules |
|-------|--------|
| Brand | Non-empty, slug charset, known brand list |
| Model | Non-empty, valid slug charset |
| Variant | Non-empty |
| Fuel | Allowed: petrol, diesel, cng, lpg, electric, hybrid, petrol+cng |
| Transmission | Allowed: mt, manual, at, automatic, amt, cvt, dct |
| Year | Numeric, range 1990 – (current year + 2) |
| Prices | Positive when present |
| City / State | Known lists (config); unknown → **warning** by default |
| Image / Brochure URL | Valid `http:` or `https:` URL when present |

### Issue shape

Every issue includes: `code`, `message`, `field`, `rowNumber`, `severity` (`error` | `warning`).

Multiple errors per row are supported.

## Output

```typescript
type CatalogValidationReport = {
  validRecords: StandardCatalogImportRecord[];
  rejectedRecords: RejectedCatalogImportRecord[];
  warnings: CatalogValidationIssue[];
  errors: CatalogValidationIssue[];
  summary: {
    totalRows, validCount, rejectedCount,
    errorCount, warningCount,
    errorsByCode, errorsByField
  };
};
```

## Usage

### Direct validation

```typescript
import { validateCatalogImportRecords } from "@/lib/catalog/import/validation";

const report = validateCatalogImportRecords(parsedRecords);
```

### Phase 3A pipeline

```typescript
import { createCatalogImportValidator } from "@/lib/catalog/import/validation";

const validator = createCatalogImportValidator();
await validator.validate(importContext);
// context.records → valid rows only
// context.metadata.catalogValidationReport → full report
```

## Configuration

All reference data is **config-only** (no Prisma):

- `knownBrandSlugs`
- `knownCitySlugs` / `knownStateSlugs`
- `allowedFuelSlugs` / `allowedTransmissionSlugs`
- `minYear` / `maxYear`
- `warnUnknownGeo` (default `true`)

Override via `validateCatalogImportRecords(records, { ...partialConfig })`.

## Tests

```bash
cd backend
npm run test:catalog-import-validation
npm run benchmark:catalog-import-validation
```

Sample invalid file: `import/samples/sample-invalid-catalog.csv`

## Safety

| Rule | Enforced |
|------|----------|
| No DB / Prisma | Config sets only |
| No publish | Validator never writes |
| No API / UI | Internal module |

## Phase boundaries

| Phase | Scope |
|-------|--------|
| 3B | CSV/XLSX parser |
| **3C** | Validation engine (this document) |
| 3D+ | Duplicate detection, publishing |
