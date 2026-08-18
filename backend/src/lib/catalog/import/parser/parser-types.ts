import type { CatalogImportSegment } from "../catalog-segment";

/** Standard catalog import field keys (Phase 3B). */

export type StandardCatalogField =
  | "brand"
  | "model"
  | "variant"
  | "fuel"
  | "transmission"
  | "year"
  | "bodyType"
  | "color"
  | "exShowroomPrice"
  | "onRoadPrice"
  | "city"
  | "state"
  | "imageUrl"
  | "brochureUrl"
  | "description"
  | "features";

export const STANDARD_CATALOG_FIELDS: readonly StandardCatalogField[] = [
  "brand",
  "model",
  "variant",
  "fuel",
  "transmission",
  "year",
  "bodyType",
  "color",
  "exShowroomPrice",
  "onRoadPrice",
  "city",
  "state",
  "imageUrl",
  "brochureUrl",
  "description",
  "features",
] as const;

export const REQUIRED_CATALOG_IMPORT_FIELDS: readonly StandardCatalogField[] = [
  "brand",
  "model",
  "variant",
  "fuel",
  "transmission",
  "year",
] as const;

export type StandardCatalogImportRecord = {
  rowNumber: number;
  segment: CatalogImportSegment;
  brand: string;
  model: string;
  variant: string;
  fuel: string;
  transmission: string;
  year: number;
  bodyType: string | null;
  color: string | null;
  exShowroomPrice: number | null;
  onRoadPrice: number | null;
  city: string | null;
  state: string | null;
  imageUrl: string | null;
  brochureUrl: string | null;
  description: string | null;
  features: string[];
};

export type InvalidCatalogImportRecord = {
  rowNumber: number;
  raw: Record<string, string>;
  issues: string[];
};

export type SpreadsheetColumnMapping = Record<string, StandardCatalogField | null>;

export type SpreadsheetParseReport = {
  validRecords: StandardCatalogImportRecord[];
  invalidRecords: InvalidCatalogImportRecord[];
  warnings: string[];
  unknownColumns: string[];
  columnMapping: SpreadsheetColumnMapping;
  totalRows: number;
};

export type SpreadsheetParseInput = {
  sourceType: "csv" | "excel";
  fileName?: string;
  /** UTF-8 text for CSV, Buffer/ArrayBuffer/Uint8Array for XLSX */
  content: string | Buffer | ArrayBuffer | Uint8Array;
  sheetName?: string;
};
