/**
 * Benchmark catalog import parser (CSV + XLSX, in-memory).
 * Run: npm run benchmark:catalog-import-parser
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { parseSpreadsheet } from "../src/lib/catalog/import/parser/spreadsheet-parser";

const samplesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/lib/catalog/import/samples");
const csvPath = path.join(samplesDir, "sample-catalog.csv");
const xlsxPath = path.join(samplesDir, "sample-catalog.xlsx");

function buildLargeCsv(rows: number): string {
  const header =
    "Manufacturer,Model,Trim,Fuel Type,Gearbox,Year,City,Extra\n";
  const lines: string[] = [header];
  for (let i = 0; i < rows; i++) {
    lines.push(
      `Hyundai,Creta,Variant ${i},Diesel,Automatic,2025,Mumbai,note-${i}\n`,
    );
  }
  return lines.join("");
}

async function main() {
  const csvSample = fs.readFileSync(csvPath, "utf8");
  const xlsxSample = fs.readFileSync(xlsxPath);
  const largeCsv = buildLargeCsv(10_000);

  const cases = [
    { name: "sample CSV", fn: () => parseSpreadsheet({ sourceType: "csv", content: csvSample }) },
    { name: "sample XLSX", fn: () => parseSpreadsheet({ sourceType: "excel", content: xlsxSample }) },
    { name: "10k row CSV", fn: () => parseSpreadsheet({ sourceType: "csv", content: largeCsv }) },
  ];

  console.log("=== Catalog Import Parser Benchmark ===\n");

  for (const c of cases) {
    c.fn();
    const start = process.hrtime.bigint();
    const report = c.fn();
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
    console.log(`${c.name}`);
    console.log(`  valid   : ${report.validRecords.length}`);
    console.log(`  invalid : ${report.invalidRecords.length}`);
    console.log(`  time    : ${ms.toFixed(2)} ms`);
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
