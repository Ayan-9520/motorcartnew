# Catalog Import Parser (Phase 3B)

Internal parser for CSV and XLSX catalog imports. **No database writes, no API, no UI.**

## Location

```
backend/src/lib/catalog/import/parser/
├── parser-types.ts
├── header-aliases.ts
├── value-normalizer.ts
├── csv-reader.ts
├── xlsx-reader.ts
├── spreadsheet-parser.ts
├── catalog-spreadsheet-parser.ts
└── spreadsheet-parser.test.ts

backend/src/lib/catalog/import/samples/
├── sample-catalog.csv
└── sample-catalog.xlsx
```

## Flow

```
Read file (CSV / XLSX)
    ↓
Detect columns automatically
    ↓
Map headers via aliases
    ↓
Normalize values (catalog rules)
    ↓
Return SpreadsheetParseReport
```

## Supported fields

| Standard field | Example aliases |
|----------------|-----------------|
| `brand` | Brand, Manufacturer, OEM, Make |
| `model` | Model, Model Name |
| `variant` | Variant, Trim, Version |
| `fuel` | Fuel, Fuel Type |
| `transmission` | Transmission, Gearbox |
| `year` | Year, Model Year |
| `bodyType` | Body Type, Segment |
| `color` | Color, Colour |
| `exShowroomPrice` | Ex Showroom Price, Price |
| `onRoadPrice` | On Road Price, ORP |
| `city` | City |
| `state` | State |
| `imageUrl` | Image URL, Photo |
| `brochureUrl` | Brochure URL |
| `description` | Description, Notes |
| `features` | Features (pipe, semicolon, or JSON array) |

**Required:** brand, model, variant, fuel, transmission, year

## Parse output

```typescript
type SpreadsheetParseReport = {
  validRecords: StandardCatalogImportRecord[];
  invalidRecords: InvalidCatalogImportRecord[];
  warnings: string[];
  unknownColumns: string[];
  columnMapping: Record<string, StandardCatalogField | null>;
  totalRows: number;
};
```

## Tolerance

- Empty columns — skipped
- Extra / unknown columns — listed in `unknownColumns`, ignored
- Wrong column order — resolved via header mapping
- Missing optional fields — `null` / `[]`

## Usage

### Direct parse

```typescript
import { parseSpreadsheet } from "@/lib/catalog/import/parser";

const report = parseSpreadsheet({
  sourceType: "csv",
  content: csvText,
});

console.log(report.validRecords);
console.log(report.invalidRecords);
console.log(report.unknownColumns);
```

### Phase 3A pipeline integration

```typescript
import { createCatalogSpreadsheetParser } from "@/lib/catalog/import/parser";

const parser = createCatalogSpreadsheetParser();
const result = await parser.parse(importContext);
// result.data → ImportRecord[]
// result.metadata.parseReport → full report envelope
```

## Normalization

Reuses Phase 2B catalog normalization:

- Brand → slug (`Maruti Suzuki` → `maruti`)
- Fuel → slug (`Petrol + CNG` → `petrol+cng`)
- Transmission → slug (`Automatic` → `at`)
- Variant → cleaned slug (`SX(O)` → `sx-o`)
- Prices → numeric (strips `₹`, commas)
- Features → string array

## Tests & samples

```bash
cd backend
npm run test:catalog-import-parser
npm run benchmark:catalog-import-parser
```

Sample files: `import/samples/sample-catalog.csv`, `sample-catalog.xlsx`

Regenerate XLSX from CSV:

```bash
npx tsx scripts/generate-sample-catalog-xlsx.ts
```

## Safety

| Rule | Enforced |
|------|----------|
| No DB writes | Pure in-memory transform |
| No Prisma | Not imported |
| No API / UI | Internal library only |
| Backward compatible | Additive parser module |

## Phase boundaries

| Phase | Scope |
|-------|--------|
| 3A | Import pipeline skeleton |
| **3B** | CSV & XLSX parser (this document) |
| 3C | Validator, duplicate detection, publishing |
