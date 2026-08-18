/**
 * Generate sample-catalog.xlsx from sample-catalog.csv for fixtures.
 * Run once: npx tsx scripts/generate-sample-catalog-xlsx.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { readCsvTable } from "../src/lib/catalog/import/parser/csv-reader";

const root = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(root, "../src/lib/catalog/import/samples/sample-catalog.csv");
const xlsxPath = path.join(root, "../src/lib/catalog/import/samples/sample-catalog.xlsx");

const csv = fs.readFileSync(csvPath, "utf8");
const table = readCsvTable(csv);
const sheet = XLSX.utils.aoa_to_sheet([table.headers, ...table.rows]);
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, sheet, "Catalog");
XLSX.writeFile(book, xlsxPath);
console.log(`Wrote ${xlsxPath}`);
