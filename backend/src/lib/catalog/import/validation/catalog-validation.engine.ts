import type { ImportRecord } from "../import-types";
import type { StandardCatalogImportRecord } from "../parser/parser-types";
import { importRecordToStandard as normalizeImportRecordToStandard } from "../import-record-normalizer";
import { DEFAULT_VALIDATION_CONFIG, mergeValidationConfig } from "./validation-config";
import { validateRecordRow } from "./validation-rules";
import type {
  CatalogValidationConfig,
  CatalogValidationIssue,
  CatalogValidationReport,
  CatalogValidationSummary,
  RejectedCatalogImportRecord,
} from "./validation-types";

function buildSummary(
  totalRows: number,
  validRecords: StandardCatalogImportRecord[],
  rejectedRecords: RejectedCatalogImportRecord[],
  warnings: CatalogValidationIssue[],
  errors: CatalogValidationIssue[],
): CatalogValidationSummary {
  const errorsByCode: Record<string, number> = {};
  const errorsByField: Record<string, number> = {};

  for (const err of errors) {
    errorsByCode[err.code] = (errorsByCode[err.code] ?? 0) + 1;
    errorsByField[String(err.field)] = (errorsByField[String(err.field)] ?? 0) + 1;
  }

  return {
    totalRows,
    validCount: validRecords.length,
    rejectedCount: rejectedRecords.length,
    errorCount: errors.length,
    warningCount: warnings.length,
    errorsByCode,
    errorsByField,
  };
}

/** Validate catalog import records (Phase 3C — config only, no DB). */
export function validateCatalogImportRecords(
  records: StandardCatalogImportRecord[],
  config: Partial<CatalogValidationConfig> = {},
): CatalogValidationReport {
  const cfg = mergeValidationConfig(config);
  const validRecords: StandardCatalogImportRecord[] = [];
  const rejectedRecords: RejectedCatalogImportRecord[] = [];
  const allWarnings: CatalogValidationIssue[] = [];
  const allErrors: CatalogValidationIssue[] = [];

  for (const record of records) {
    const rowIssues = validateRecordRow(record, cfg);
    const rowErrors = rowIssues.filter((i) => i.severity === "error");
    const rowWarnings = rowIssues.filter((i) => i.severity === "warning");

    allWarnings.push(...rowWarnings);
    allErrors.push(...rowErrors);

    if (rowErrors.length > 0) {
      rejectedRecords.push({ rowNumber: record.rowNumber, record, errors: rowErrors });
    } else {
      validRecords.push(record);
    }
  }

  return {
    validRecords,
    rejectedRecords,
    warnings: allWarnings,
    errors: allErrors,
    summary: buildSummary(records.length, validRecords, rejectedRecords, allWarnings, allErrors),
  };
}

export function importRecordToStandard(record: ImportRecord, payloadSegment?: unknown): StandardCatalogImportRecord | null {
  return normalizeImportRecordToStandard(record, payloadSegment);
}

export function validateImportRecords(
  records: ImportRecord[],
  config?: Partial<CatalogValidationConfig>,
): CatalogValidationReport {
  const standard: StandardCatalogImportRecord[] = [];
  const conversionRejected: RejectedCatalogImportRecord[] = [];
  const conversionErrors: CatalogValidationIssue[] = [];

  for (const record of records) {
    const converted = importRecordToStandard(record);
    if (!converted) {
      const error: CatalogValidationIssue = {
        code: "RECORD_NOT_NORMALIZABLE",
        message: "Row could not be converted to a standard catalog record",
        field: "record",
        rowNumber: record.rowNumber,
        severity: "error",
      };
      conversionErrors.push(error);
      conversionRejected.push({
        rowNumber: record.rowNumber,
        record: {
          rowNumber: record.rowNumber,
          segment: record.segment,
          brand: String(record.fields.brand ?? ""),
          model: String(record.fields.model ?? ""),
          variant: String(record.fields.variant ?? ""),
        },
        errors: [error],
      });
      continue;
    }
    standard.push(converted);
  }

  const report = validateCatalogImportRecords(standard, config);
  if (!conversionRejected.length) return report;

  return {
    validRecords: report.validRecords,
    rejectedRecords: [...conversionRejected, ...report.rejectedRecords],
    warnings: report.warnings,
    errors: [...conversionErrors, ...report.errors],
    summary: buildSummary(
      records.length,
      report.validRecords,
      [...conversionRejected, ...report.rejectedRecords],
      report.warnings,
      [...conversionErrors, ...report.errors],
    ),
  };
}

export { DEFAULT_VALIDATION_CONFIG };
