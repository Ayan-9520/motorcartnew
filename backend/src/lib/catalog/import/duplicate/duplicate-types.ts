/** Catalog import duplicate detection types (Phase 3D). */

import type { CatalogImportSegment } from "../catalog-segment";
import { DEFAULT_CATALOG_IMPORT_SEGMENT } from "../catalog-segment";
import type { StandardCatalogImportRecord } from "../parser/parser-types";

export type DuplicateClassification = "DUPLICATE" | "POSSIBLE_DUPLICATE" | "UNIQUE";

export type DuplicateSignal =
  | "business_key"
  | "source_id"
  | "image_url"
  | "attributes"
  | "attributes_price";

export type DuplicateDetectionRecord = StandardCatalogImportRecord & {
  sourceId?: string | null;
};

export type DuplicateRecordResult = {
  rowNumber: number;
  classification: DuplicateClassification;
  businessKey: string;
  matchedSignals: DuplicateSignal[];
  groupIds: string[];
};

export type DuplicateGroup = {
  groupId: string;
  signal: DuplicateSignal;
  fingerprint: string;
  classification: DuplicateClassification;
  rowNumbers: number[];
  records: DuplicateDetectionRecord[];
};

export type MergeRecommendation = {
  kind: "MERGE_DUPLICATE" | "REVIEW_POSSIBLE_DUPLICATE";
  message: string;
  groupId: string;
  rowNumbers: number[];
  signal: DuplicateSignal;
  priority: "high" | "medium";
};

export type DuplicateDetectionSummary = {
  totalRecords: number;
  duplicateCount: number;
  possibleDuplicateCount: number;
  uniqueCount: number;
  groupCount: number;
  bySignal: Record<DuplicateSignal, number>;
};

export type DuplicateDetectionReport = {
  checked: true;
  results: DuplicateRecordResult[];
  groups: DuplicateGroup[];
  mergeRecommendations: MergeRecommendation[];
  summary: DuplicateDetectionSummary;
};

export type DuplicateDetectionConfig = {
  defaultSegment: CatalogImportSegment;
  /** Treat same image URL + matching attributes as duplicate signal. Default true */
  strictImageUrl: boolean;
};

export const DEFAULT_DUPLICATE_CONFIG: DuplicateDetectionConfig = {
  defaultSegment: DEFAULT_CATALOG_IMPORT_SEGMENT,
  strictImageUrl: true,
};
