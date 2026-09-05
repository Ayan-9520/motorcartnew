/**
 * Benchmark catalog import duplicate detection (in-memory).
 * Run: npm run benchmark:catalog-import-duplicate
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectCatalogDuplicates } from "../src/lib/catalog/import/duplicate/duplicate-detection.engine";
import type { DuplicateDetectionRecord } from "../src/lib/catalog/import/duplicate/duplicate-types";
import { parseSpreadsheet } from "../src/lib/catalog/import/parser/spreadsheet-parser";

const sampleCsv = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/lib/catalog/import/samples/sample-catalog.csv",
);

function buildRecords(count: number): DuplicateDetectionRecord[] {
  const records: DuplicateDetectionRecord[] = [];
  for (let i = 0; i < count; i++) {
    const duplicatePair = i % 100 < 2;
    records.push({
      rowNumber: i + 2,
      brand: duplicatePair ? "hyundai" : `brand-${i % 50}`,
      model: duplicatePair ? "creta" : "model-x",
      variant: duplicatePair ? "sx" : `variant-${i}`,
      fuel: "diesel",
      transmission: "at",
      year: 2025,
      bodyType: null,
      color: null,
      exShowroomPrice: duplicatePair ? 1490000 : 1000000 + i,
      onRoadPrice: null,
      city: "Mumbai",
      state: "Maharashtra",
      imageUrl: duplicatePair ? "https://example.com/shared.jpg" : `https://example.com/img-${i}.jpg`,
      brochureUrl: null,
      description: null,
      features: [],
      sourceId: duplicatePair ? "feed-dup" : `src-${i}`,
    });
  }
  return records;
}

async function main() {
  const csvContent = fs.readFileSync(sampleCsv, "utf8");
  const parsed = parseSpreadsheet({ sourceType: "csv", content: csvContent });
  const fromSample: DuplicateDetectionRecord[] = parsed.validRecords.map((r) => ({ ...r }));

  const large = buildRecords(10_000);

  const cases = [
    { name: "sample parsed (3 valid)", records: fromSample },
    { name: "10k synthetic rows (~2% dup pairs)", records: large },
  ];

  console.log("=== Catalog Import Duplicate Detection Benchmark ===\n");

  for (const c of cases) {
    detectCatalogDuplicates(c.records);
    const start = process.hrtime.bigint();
    const report = detectCatalogDuplicates(c.records);
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;

    console.log(c.name);
    console.log(`  rows                : ${c.records.length}`);
    console.log(`  duplicate           : ${report.summary.duplicateCount}`);
    console.log(`  possible duplicate  : ${report.summary.possibleDuplicateCount}`);
    console.log(`  unique              : ${report.summary.uniqueCount}`);
    console.log(`  groups              : ${report.summary.groupCount}`);
    console.log(`  merge recommendations: ${report.mergeRecommendations.length}`);
    console.log(`  time                : ${ms.toFixed(2)} ms`);
    console.log(`  rows/sec            : ${Math.round(c.records.length / (ms / 1000)).toLocaleString()}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
