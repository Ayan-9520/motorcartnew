/** Catalog import validation types (Phase 3C). */

import type { StandardCatalogField, StandardCatalogImportRecord } from "../parser/parser-types";

export type ValidationSeverity = "error" | "warning";

export type CatalogValidationIssue = {
  code: string;
  message: string;
  field: StandardCatalogField | string;
  rowNumber: number;
  severity: ValidationSeverity;
};

export type RejectedCatalogImportRecord = {
  rowNumber: number;
  record: Partial<StandardCatalogImportRecord>;
  errors: CatalogValidationIssue[];
};

export type CatalogValidationSummary = {
  totalRows: number;
  validCount: number;
  rejectedCount: number;
  errorCount: number;
  warningCount: number;
  errorsByCode: Record<string, number>;
  errorsByField: Record<string, number>;
};

export type CatalogValidationReport = {
  validRecords: StandardCatalogImportRecord[];
  rejectedRecords: RejectedCatalogImportRecord[];
  warnings: CatalogValidationIssue[];
  errors: CatalogValidationIssue[];
  summary: CatalogValidationSummary;
};

export type CatalogValidationConfig = {
  knownBrandSlugs: ReadonlySet<string>;
  knownCitySlugs: ReadonlySet<string>;
  knownCityNames: ReadonlySet<string>;
  knownStateSlugs: ReadonlySet<string>;
  knownStateNames: ReadonlySet<string>;
  allowedFuelSlugs: ReadonlySet<string>;
  allowedTransmissionSlugs: ReadonlySet<string>;
  minYear: number;
  maxYear: number;
  /** When true, unknown brand is warning not error. Default false */
  warnUnknownBrand: boolean;
  /** When true, unknown city/state is warning. Default true */
  warnUnknownGeo: boolean;
};
