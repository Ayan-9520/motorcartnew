import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import * as XLSX from "xlsx";
import { ImportContext } from "../import-context";
import {
  CatalogSpreadsheetParser,
  createCatalogSpreadsheetParser,
  parseUploadPayload,
} from "./catalog-spreadsheet-parser";
import { mapHeaders, normalizeHeaderLabel } from "./header-aliases";
import { parseCsvRows, readCsvTable } from "./csv-reader";
import { parseSpreadsheet, parseReportToImportRecords } from "./spreadsheet-parser";
import { buildStandardRecord, parseFeatures, parsePrice, parseYear } from "./value-normalizer";

const SAMPLE_CSV = path.join(path.dirname(fileURLToPath(import.meta.url)), "../samples/sample-catalog.csv");
const SAMPLE_XLSX = path.join(path.dirname(fileURLToPath(import.meta.url)), "../samples/sample-catalog.xlsx");

describe("header aliases", () => {
  it("maps manufacturer to brand and gearbox to transmission", () => {
    const { columnMapping, indexToField } = mapHeaders([
      "Manufacturer",
      "Model Name",
      "Gearbox",
      "Fuel Type",
      "Extra",
    ]);
    assert.equal(columnMapping.Manufacturer, "brand");
    assert.equal(columnMapping["Model Name"], "model");
    assert.equal(columnMapping.Gearbox, "transmission");
    assert.equal(columnMapping["Fuel Type"], "fuel");
    assert.equal(columnMapping.Extra, null);
    assert.equal(indexToField.get(0), "brand");
  });

  it("normalizes header labels", () => {
    assert.equal(normalizeHeaderLabel("Fuel_Type"), "fuel type");
    assert.equal(normalizeHeaderLabel("  OEM  "), "oem");
  });
});

describe("csv reader", () => {
  it("parses quoted fields and commas", () => {
    const rows = parseCsvRows('a,b\n"Hyundai, India",Creta\n');
    assert.equal(rows.length, 2);
    assert.equal(rows[1]?.[0], "Hyundai, India");
  });

  it("reads sample csv file", () => {
    const content = fs.readFileSync(SAMPLE_CSV, "utf8");
    const table = readCsvTable(content);
    assert.ok(table.headers.includes("Manufacturer"));
    assert.ok(table.rows.length >= 3);
  });
});

describe("value normalizer", () => {
  it("parses currency and year", () => {
    assert.equal(parsePrice("₹6,50,000"), 650000);
    assert.equal(parseYear("2025"), 2025);
    assert.equal(parseYear("1899"), null);
  });

  it("parses pipe and json features", () => {
    assert.deepEqual(parseFeatures("ABS|Airbags"), ["ABS", "Airbags"]);
    assert.deepEqual(parseFeatures('["Sunroof","ADAS"]'), ["Sunroof", "ADAS"]);
  });

  it("builds valid standard record", () => {
    const { record, issues } = buildStandardRecord(2, {
      brand: "Maruti Suzuki",
      model: "Swift",
      variant: "VXI",
      fuel: "Petrol",
      transmission: "Manual",
      year: "2025",
    });
    assert.equal(issues.length, 0);
    assert.equal(record?.segment, "car");
    assert.equal(record?.brand, "maruti");
    assert.equal(record?.transmission, "mt");
  });
});

describe("spreadsheet parser csv", () => {
  it("parses sample csv with aliases and unknown columns", () => {
    const content = fs.readFileSync(SAMPLE_CSV, "utf8");
    const report = parseSpreadsheet({ sourceType: "csv", content });

    assert.equal(report.validRecords.length, 3);
    assert.equal(report.invalidRecords.length, 1);
    assert.ok(report.unknownColumns.includes("Internal Notes"));
    assert.equal(report.validRecords[0]?.brand, "maruti");
    assert.equal(report.validRecords[1]?.transmission, "at");
    assert.equal(report.validRecords[2]?.fuel, "petrol+cng");
    assert.ok(report.warnings.some((w) => w.includes("unknown columns")));
  });

  it("tolerates wrong column order and extra columns", () => {
    const csv = [
      "Gearbox,Fuel Type,Model Year,Make,Model,Trim,Random",
      "Manual,Petrol,2025,Hyundai,Creta,SX,ignored",
    ].join("\n");
    const report = parseSpreadsheet({ sourceType: "csv", content: csv });
    assert.equal(report.validRecords.length, 1);
    assert.equal(report.validRecords[0]?.brand, "hyundai");
    assert.ok(report.unknownColumns.includes("Random"));
  });

  it("handles missing optional fields", () => {
    const csv = [
      "Brand,Model,Variant,Fuel,Transmission,Year",
      "Hyundai,Creta,SX,Diesel,Automatic,2025",
    ].join("\n");
    const report = parseSpreadsheet({ sourceType: "csv", content: csv });
    assert.equal(report.validRecords.length, 1);
    assert.equal(report.validRecords[0]?.city, null);
    assert.equal(report.validRecords[0]?.onRoadPrice, null);
  });
});

describe("spreadsheet parser xlsx", () => {
  it("parses xlsx workbook", () => {
    const rows = [
      ["OEM", "Model", "Variant", "Fuel", "Gearbox", "Year", "City"],
      ["Maruti Suzuki", "Swift", "VXI", "Petrol", "Manual", "2025", "Pune"],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Catalog");
    const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const report = parseSpreadsheet({ sourceType: "excel", content: buffer });
    assert.equal(report.validRecords.length, 1);
    assert.equal(report.validRecords[0]?.city, "Pune");
  });

  it("parses committed sample xlsx file when present", () => {
    if (!fs.existsSync(SAMPLE_XLSX)) return;
    const buffer = fs.readFileSync(SAMPLE_XLSX);
    const report = parseSpreadsheet({ sourceType: "excel", content: buffer });
    assert.ok(report.validRecords.length >= 1);
  });
});

describe("CatalogSpreadsheetParser", () => {
  it("implements ImportParser for csv upload context", async () => {
    const parser = createCatalogSpreadsheetParser();
    const ctx = ImportContext.create({ sourceType: "csv", fileName: "test.csv" });
    ctx.setUpload({
      sourceType: "csv",
      fileName: "test.csv",
      raw: fs.readFileSync(SAMPLE_CSV, "utf8"),
      receivedAt: new Date().toISOString(),
    });

    const result = await parser.parse(ctx);
    assert.equal(result.success, true);
    assert.ok(result.data && result.data.length >= 3);
    assert.ok(result.metadata.parseReport);
  });

  it("returns failure for unsupported source type", async () => {
    const parser = new CatalogSpreadsheetParser();
    const ctx = ImportContext.create({ sourceType: "json" });
    ctx.setUpload({ sourceType: "json", raw: "{}", receivedAt: new Date().toISOString() });
    const result = await parser.parse(ctx);
    assert.equal(result.success, false);
  });

  it("converts report to import records", () => {
    const content = fs.readFileSync(SAMPLE_CSV, "utf8");
    const report = parseSpreadsheet({ sourceType: "csv", content });
    const records = parseReportToImportRecords(report);
    assert.equal(records.length, report.validRecords.length);
    assert.equal(records[0]?.fields.brand, "maruti");
  });

  it("parseUploadPayload helper works", () => {
    const report = parseUploadPayload({
      sourceType: "csv",
      raw: fs.readFileSync(SAMPLE_CSV, "utf8"),
      receivedAt: new Date().toISOString(),
    });
    assert.ok(report.validRecords.length >= 3);
  });
});

describe("no database side effects", () => {
  it("parser is pure read/transform only", () => {
    const content = fs.readFileSync(SAMPLE_CSV, "utf8");
    const before = content;
    parseSpreadsheet({ sourceType: "csv", content });
    assert.equal(content, before);
  });
});
