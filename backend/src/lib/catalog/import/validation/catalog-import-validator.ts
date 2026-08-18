import type { ImportContext } from "../import-context";
import type { ImportValidator } from "../import-interfaces";
import { ImportError, importFailure, importSuccess, type ImportResult, type ImportValidationIssue, type ImportValidationReport } from "../import-types";
import { standardRecordToImportFields } from "../parser/value-normalizer";
import { validateImportRecords } from "./catalog-validation.engine";
import type { CatalogValidationReport } from "./validation-types";

function toImportValidationIssues(report: CatalogValidationReport): ImportValidationIssue[] {
  return [
    ...report.errors.map((e) => ({
      code: e.code,
      message: e.message,
      rowNumber: e.rowNumber,
      field: String(e.field),
    })),
    ...report.warnings.map((w) => ({
      code: w.code,
      message: w.message,
      rowNumber: w.rowNumber,
      field: String(w.field),
    })),
  ];
}

function toPipelineValidationReport(report: CatalogValidationReport): ImportValidationReport {
  return {
    valid: report.rejectedRecords.length === 0,
    recordCount: report.validRecords.length,
    issues: toImportValidationIssues(report),
  };
}

/** Phase 3C — implements ImportValidator (read-only, no DB). */
export class CatalogImportValidator implements ImportValidator {
  async validate(context: ImportContext): Promise<ImportResult<ImportValidationReport>> {
    try {
      const report = validateImportRecords([...context.records]);

      const validImportRecords = report.validRecords.map((record) => ({
        rowNumber: record.rowNumber,
        segment: record.segment,
        fields: standardRecordToImportFields(record),
        raw: record,
      }));

      context.setRecords(validImportRecords);

      const pipelineReport = toPipelineValidationReport(report);
      context.metadata.catalogValidationReport = report;

      if (report.warnings.length) {
        for (const w of report.warnings) {
          context.addWarning(`Row ${w.rowNumber}: ${w.message}`);
        }
      }

      return importSuccess("validate", pipelineReport, {
        warnings: report.warnings.map((w) => `Row ${w.rowNumber}: ${w.message}`),
        metadata: {
          catalogValidationReport: report,
          validCount: report.summary.validCount,
          rejectedCount: report.summary.rejectedCount,
        },
      });
    } catch (error) {
      return importFailure("validate", [
        new ImportError("Validation engine failed", "VALIDATION_ENGINE_ERROR", {
          stage: "validate",
          cause: error,
        }),
      ]);
    }
  }
}

export function createCatalogImportValidator(): CatalogImportValidator {
  return new CatalogImportValidator();
}

export function validateCatalogRecordsFromContext(context: ImportContext): CatalogValidationReport {
  return validateImportRecords([...context.records]);
}
