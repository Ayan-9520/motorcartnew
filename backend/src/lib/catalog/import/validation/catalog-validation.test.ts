import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { ImportContext } from "../import-context";
import { parseSpreadsheet } from "../parser/spreadsheet-parser";
import { createCatalogImportValidator } from "./catalog-import-validator";
import {
  importRecordToStandard,
  validateCatalogImportRecords,
  validateImportRecords,
} from "./catalog-validation.engine";
import { DEFAULT_VALIDATION_CONFIG } from "./validation-config";
import { isValidHttpUrl, validateRecordRow } from "./validation-rules";
import type { StandardCatalogImportRecord } from "../parser/parser-types";

const INVALID_CSV = path.join(path.dirname(fileURLToPath(import.meta.url)), "../samples/sample-invalid-catalog.csv");

function record(partial: Partial<StandardCatalogImportRecord> & Pick<StandardCatalogImportRecord, "rowNumber">): StandardCatalogImportRecord {
  return {
    segment: "car",
    brand: "hyundai",
    model: "creta",
    variant: "sx",
    fuel: "diesel",
    transmission: "at",
    year: 2025,
    bodyType: null,
    color: null,
    exShowroomPrice: null,
    onRoadPrice: null,
    city: "Mumbai",
    state: "Maharashtra",
    imageUrl: null,
    brochureUrl: null,
    description: null,
    features: [],
    ...partial,
  };
}

describe("validation rules", () => {
  it("detects empty required fields", () => {
    const issues = validateRecordRow(record({ rowNumber: 2, brand: "" }), DEFAULT_VALIDATION_CONFIG);
    assert.ok(issues.some((i) => i.code === "BRAND_EMPTY" && i.severity === "error"));
  });

  it("detects unknown brand and invalid fuel", () => {
    const issues = validateRecordRow(
      record({ rowNumber: 3, brand: "unknown-oem", fuel: "unobtanium" }),
      DEFAULT_VALIDATION_CONFIG,
    );
    assert.ok(issues.some((i) => i.code === "BRAND_UNKNOWN"));
    assert.ok(issues.some((i) => i.code === "FUEL_NOT_ALLOWED"));
  });

  it("detects year out of range and invalid price", () => {
    const issues = validateRecordRow(
      record({ rowNumber: 4, year: 1800, exShowroomPrice: -1 }),
      DEFAULT_VALIDATION_CONFIG,
    );
    assert.ok(issues.some((i) => i.code === "YEAR_OUT_OF_RANGE"));
    assert.ok(issues.some((i) => i.code === "PRICE_INVALID"));
  });

  it("detects invalid URLs", () => {
    assert.equal(isValidHttpUrl("https://example.com/a.jpg"), true);
    assert.equal(isValidHttpUrl("not-a-url"), false);
    const issues = validateRecordRow(record({ rowNumber: 5, imageUrl: "bad url" }), DEFAULT_VALIDATION_CONFIG);
    assert.ok(issues.some((i) => i.code === "URL_INVALID" && i.field === "imageUrl"));
  });

  it("allows multiple errors per row", () => {
    const issues = validateRecordRow(
      record({ rowNumber: 6, brand: "", variant: "", fuel: "bad", year: NaN }),
      DEFAULT_VALIDATION_CONFIG,
    );
    const errors = issues.filter((i) => i.severity === "error");
    assert.ok(errors.length >= 3);
  });

  it("detects invalid brand characters", () => {
    const issues = validateRecordRow(record({ rowNumber: 8, brand: "hyundai!" }), DEFAULT_VALIDATION_CONFIG);
    assert.ok(issues.some((i) => i.code === "BRAND_INVALID_CHARS"));
  });

  it("detects empty fuel and transmission", () => {
    const fuelIssues = validateRecordRow(record({ rowNumber: 9, fuel: "" }), DEFAULT_VALIDATION_CONFIG);
    const transIssues = validateRecordRow(record({ rowNumber: 10, transmission: "" }), DEFAULT_VALIDATION_CONFIG);
    assert.ok(fuelIssues.some((i) => i.code === "FUEL_EMPTY"));
    assert.ok(transIssues.some((i) => i.code === "TRANSMISSION_EMPTY"));
  });

  it("detects invalid brochure URL", () => {
    const issues = validateRecordRow(record({ rowNumber: 11, brochureUrl: "ftp://x.com" }), DEFAULT_VALIDATION_CONFIG);
    assert.ok(issues.some((i) => i.code === "URL_INVALID" && i.field === "brochureUrl"));
  });
});

describe("validateCatalogImportRecords", () => {
  it("splits valid and rejected records", () => {
    const report = validateCatalogImportRecords([
      record({ rowNumber: 2 }),
      record({ rowNumber: 3, brand: "fake-brand" }),
    ]);
    assert.equal(report.validRecords.length, 1);
    assert.equal(report.rejectedRecords.length, 1);
    assert.ok((report.summary.errorsByCode.BRAND_UNKNOWN ?? 0) >= 1);
  });

  it("collects warnings for unknown geo without rejecting", () => {
    const report = validateCatalogImportRecords([
      record({ rowNumber: 2, city: "Unknown City", state: "Unknown State" }),
    ]);
    assert.equal(report.validRecords.length, 1);
    assert.ok(report.warnings.some((w) => w.code === "CITY_UNKNOWN"));
    assert.ok(report.warnings.some((w) => w.code === "STATE_UNKNOWN"));
  });

  it("builds summary with error counts", () => {
    const report = validateCatalogImportRecords([
      record({ rowNumber: 2 }),
      record({ rowNumber: 3, fuel: "invalid" }),
      record({ rowNumber: 4, transmission: "invalid" }),
    ]);
    assert.equal(report.summary.totalRows, 3);
    assert.equal(report.summary.validCount, 1);
    assert.equal(report.summary.rejectedCount, 2);
    assert.ok(report.summary.errorCount >= 2);
  });

  it("validateImportRecords handles empty input", () => {
    const report = validateImportRecords([]);
    assert.equal(report.summary.totalRows, 0);
  });

  it("supports warnUnknownBrand config", () => {
    const report = validateCatalogImportRecords([record({ rowNumber: 2, brand: "unknown-oem" })], {
      warnUnknownBrand: true,
    });
    assert.equal(report.validRecords.length, 1);
    assert.ok(report.warnings.some((w) => w.code === "BRAND_UNKNOWN"));
  });
});

describe("invalid sample file integration", () => {
  it("parses and validates sample-invalid-catalog.csv", () => {
    const content = fs.readFileSync(INVALID_CSV, "utf8");
    const parsed = parseSpreadsheet({ sourceType: "csv", content });
    const report = validateCatalogImportRecords(parsed.validRecords);

    assert.ok(parsed.invalidRecords.length >= 1, "parser rejects structurally invalid rows");
    assert.ok(report.validRecords.length >= 1);
    assert.ok(report.rejectedRecords.length >= 1);
    assert.ok(report.errors.length >= 1);
    assert.ok(Object.keys(report.summary.errorsByCode).length >= 1);
    assert.ok(report.warnings.length >= 1);
  });
});

describe("CatalogImportValidator", () => {
  it("implements ImportValidator and filters context records", async () => {
    const validator = createCatalogImportValidator();
    const ctx = ImportContext.create({ sourceType: "csv" });
    ctx.setRecords([
      {
        rowNumber: 2,
        segment: "car",
        fields: {
          brand: "hyundai",
          model: "creta",
          variant: "sx",
          fuel: "diesel",
          transmission: "at",
          year: 2025,
        },
      },
      {
        rowNumber: 3,
        segment: "car",
        fields: {
          brand: "unknown-oem",
          model: "x",
          variant: "y",
          fuel: "diesel",
          transmission: "at",
          year: 2025,
        },
      },
    ]);

    const result = await validator.validate(ctx);
    assert.equal(result.success, true);
    assert.equal(ctx.records.length, 1);
    assert.ok(ctx.metadata.catalogValidationReport);
    assert.equal(result.data?.valid, false);
  });

  it("importRecordToStandard converts pipeline records", () => {
    const std = importRecordToStandard({
      rowNumber: 2,
      segment: "car",
      fields: { brand: "hyundai", model: "creta", variant: "sx", fuel: "diesel", transmission: "at", year: 2025 },
    });
    assert.equal(std?.brand, "hyundai");
    assert.equal(std?.segment, "car");
  });
});

describe("no database side effects", () => {
  it("validation is pure config-based", () => {
    const report = validateCatalogImportRecords([record({ rowNumber: 2 })]);
    assert.equal(report.validRecords.length, 1);
  });
});
