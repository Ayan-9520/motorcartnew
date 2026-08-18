import type { HeaderAliasRule } from "./header-aliases";
import { mapHeaders } from "./header-aliases";
import type {
  InvalidCatalogImportRecord,
  SpreadsheetParseInput,
  SpreadsheetParseReport,
  StandardCatalogField,
  StandardCatalogImportRecord,
} from "./parser-types";
import { readCsvTable } from "./csv-reader";
import { readXlsxTable } from "./xlsx-reader";
import { resolveCatalogImportSegment } from "../catalog-segment";
import { normalizeImportRecord } from "../import-record-normalizer";
import { standardRecordToImportFields, trimCell } from "./value-normalizer";
import type { ImportRecord } from "../import-types";

function toNodeBuffer(content: SpreadsheetParseInput["content"]): Buffer {
  if (typeof content === "string") return Buffer.from(content, "utf8");
  if (Buffer.isBuffer(content)) return content;
  if (content instanceof Uint8Array) return Buffer.from(content);
  return Buffer.from(new Uint8Array(content));
}

function readTable(input: SpreadsheetParseInput): { headers: string[]; rows: string[][]; warnings: string[] } {
  const warnings: string[] = [];

  if (input.sourceType === "csv") {
    const text = typeof input.content === "string" ? input.content : toNodeBuffer(input.content).toString("utf8");
    const table = readCsvTable(text);
    if (table.headers.length === 0) warnings.push("CSV file contains no header row");
    return { ...table, warnings };
  }

  const buffer =
    typeof input.content === "string"
      ? Buffer.from(input.content, "binary")
      : toNodeBuffer(input.content);

  const table = readXlsxTable(buffer, input.sheetName);
  if (!table.sheetName) warnings.push("Excel workbook contains no sheets");
  if (table.headers.length === 0) warnings.push("Excel sheet contains no header row");
  return { headers: table.headers, rows: table.rows, warnings };
}

export function parseSpreadsheet(
  input: SpreadsheetParseInput,
  aliasRules?: HeaderAliasRule[],
): SpreadsheetParseReport {
  const { headers, rows, warnings: readWarnings } = readTable(input);
  const { columnMapping, unknownColumns, indexToField } = mapHeaders(headers, aliasRules);

  const validRecords: StandardCatalogImportRecord[] = [];
  const invalidRecords: InvalidCatalogImportRecord[] = [];
  const warnings = [...readWarnings];

  if (unknownColumns.length) {
    warnings.push(`Ignored unknown columns: ${unknownColumns.join(", ")}`);
  }

  const requiredMapped = ["brand", "model", "variant", "fuel", "transmission", "year"] as const;
  const mappedFields = new Set(indexToField.values());
  const missingRequired = requiredMapped.filter((field) => !mappedFields.has(field));
  if (missingRequired.length) {
    warnings.push(`Missing required column mappings: ${missingRequired.join(", ")}`);
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const values: Partial<Record<StandardCatalogField, string>> = {};
    const raw: Record<string, string> = {};

    headers.forEach((header, colIndex) => {
      const trimmedHeader = header.trim();
      if (trimmedHeader) raw[trimmedHeader] = trimCell(row[colIndex]);
    });

    indexToField.forEach((field, colIndex) => {
      values[field] = trimCell(row[colIndex]);
    });

    if (Object.values(values).every((v) => !v) && Object.values(raw).every((v) => !v)) {
      return;
    }

    const segment = resolveCatalogImportSegment(raw.segment, raw.Segment, values.bodyType);
    const fields: Record<string, string | number | boolean | null> = {};
    indexToField.forEach((field, colIndex) => {
      fields[field] = trimCell(row[colIndex]);
    });

    const importRecord: ImportRecord = { rowNumber, segment, fields, raw };
    const normalized = normalizeImportRecord(importRecord);

    if (normalized.standard) {
      validRecords.push(normalized.standard);
    } else {
      invalidRecords.push({ rowNumber, raw, issues: normalized.issues });
    }
  });

  return {
    validRecords,
    invalidRecords,
    warnings,
    unknownColumns,
    columnMapping,
    totalRows: rows.length,
  };
}

/** Convert parse report to Phase 3A ImportRecord list (valid rows only). */
export function parseReportToImportRecords(report: SpreadsheetParseReport): ImportRecord[] {
  return report.validRecords.map((record) => ({
    rowNumber: record.rowNumber,
    segment: record.segment,
    fields: standardRecordToImportFields(record),
    raw: record,
  }));
}
