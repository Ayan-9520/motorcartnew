/**
 * Benchmark catalog import validation (in-memory).
 * Run: npm run benchmark:catalog-import-validation
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSpreadsheet, parseReportToImportRecords } from "../src/lib/catalog/import/parser/spreadsheet-parser";
import { validateCatalogImportRecords } from "../src/lib/catalog/import/validation/catalog-validation.engine";
import type { StandardCatalogImportRecord } from "../src/lib/catalog/import/parser/parser-types";

const sampleCsv = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/lib/catalog/import/samples/sample-catalog.csv",
);

function buildRecords(count: number): StandardCatalogImportRecord[] {
  const records: StandardCatalogImportRecord[] = [];
  for (let i = 0; i < count; i++) {
    records.push({
      rowNumber: i + 2,
      brand: i % 5 === 0 ? "unknown-brand" : "hyundai",
      model: "creta",
      variant: `variant-${i}`,
      fuel: "diesel",
      transmission: "at",
      year: 2025,
      bodyType: null,
      color: null,
      exShowroomPrice: 1000000 + i,
      onRoadPrice: null,
      city: "Mumbai",
      state: "Maharashtra",
      imageUrl: "https://example.com/img.jpg",
      brochureUrl: null,
      description: null,
      features: [],
    });
  }
  return records;
}

async function main() {
  const csvContent = fs.readFileSync(sampleCsv, "utf8");
  const parsed = parseSpreadsheet({ sourceType: "csv", content: csvContent });
  const fromParser = parseReportToImportRecords(parsed).map((r) => r.raw as StandardCatalogImportRecord);
  const large = buildRecords(10_000);

  const cases = [
    { name: "sample parsed (3 valid)", records: fromParser },
    { name: "10k synthetic rows", records: large },
  ];

  console.log("=== Catalog Import Validation Benchmark ===\n");

  for (const c of cases) {
    validateCatalogImportRecords(c.records);
    const start = process.hrtime.bigint();
    const report = validateCatalogImportRecords(c.records);
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;

    console.log(c.name);
    console.log(`  rows      : ${c.records.length}`);
    console.log(`  valid     : ${report.summary.validCount}`);
    console.log(`  rejected  : ${report.summary.rejectedCount}`);
    console.log(`  time      : ${ms.toFixed(2)} ms`);
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
