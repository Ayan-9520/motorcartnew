import type { ImportContext } from "../import-context";
import { detectDuplicatesFromImportRecords, toImportDuplicateReport } from "./duplicate-detection.engine";
import type { DuplicateDetectionConfig, DuplicateDetectionReport } from "./duplicate-types";

/** Runs duplicate detection against import context records (read-only). */
export function runDuplicateDetection(
  context: ImportContext,
  config?: Partial<DuplicateDetectionConfig>,
): DuplicateDetectionReport {
  const records = context.normalizedRecords.length ? [...context.normalizedRecords] : [...context.records];
  const report = detectDuplicatesFromImportRecords(records, config);
  context.setDuplicates(toImportDuplicateReport(report));
  context.metadata.catalogDuplicateReport = report;
  return report;
}
