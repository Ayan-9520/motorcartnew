import type { ImportRecord } from "../import-types";
import { importRecordToStandard, resolveRecordSegment } from "../import-record-normalizer";
import { buildRecordFingerprints, fingerprintForSignal, type RecordFingerprints } from "./duplicate-fingerprints";
import {
  DEFAULT_DUPLICATE_CONFIG,
  type DuplicateClassification,
  type DuplicateDetectionConfig,
  type DuplicateDetectionRecord,
  type DuplicateDetectionReport,
  type DuplicateGroup,
  type DuplicateRecordResult,
  type DuplicateSignal,
  type MergeRecommendation,
} from "./duplicate-types";

const SIGNALS: DuplicateSignal[] = [
  "business_key",
  "source_id",
  "image_url",
  "attributes_price",
  "attributes",
];

function classificationRank(c: DuplicateClassification): number {
  if (c === "DUPLICATE") return 2;
  if (c === "POSSIBLE_DUPLICATE") return 1;
  return 0;
}

function signalClassification(signal: DuplicateSignal, groupSize: number): DuplicateClassification {
  if (groupSize < 2) return "UNIQUE";
  if (signal === "business_key" || signal === "source_id" || signal === "attributes_price") {
    return "DUPLICATE";
  }
  return "POSSIBLE_DUPLICATE";
}

function buildGroups(
  records: DuplicateDetectionRecord[],
  fingerprints: RecordFingerprints[],
  signal: DuplicateSignal,
): DuplicateGroup[] {
  const map = new Map<string, { rowNumbers: number[]; records: DuplicateDetectionRecord[] }>();

  for (let i = 0; i < records.length; i++) {
    const fp = fingerprints[i]!;
    const record = records[i]!;
    const key = fingerprintForSignal(fp, signal);
    if (!key) continue;

    const bucket = map.get(key) ?? { rowNumbers: [], records: [] };
    bucket.rowNumbers.push(record.rowNumber);
    bucket.records.push(record);
    map.set(key, bucket);
  }

  const groups: DuplicateGroup[] = [];
  for (const [fingerprint, bucket] of map) {
    if (bucket.rowNumbers.length < 2) continue;
    groups.push({
      groupId: `${signal}:${fingerprint}`,
      signal,
      fingerprint,
      classification: signalClassification(signal, bucket.rowNumbers.length),
      rowNumbers: bucket.rowNumbers,
      records: bucket.records,
    });
  }

  return groups;
}

function buildMergeRecommendations(groups: DuplicateGroup[]): MergeRecommendation[] {
  const recs: MergeRecommendation[] = [];

  for (const group of groups) {
    if (group.classification === "DUPLICATE") {
      recs.push({
        kind: "MERGE_DUPLICATE",
        message: `Merge ${group.rowNumbers.length} rows sharing ${group.signal.replace(/_/g, " ")}`,
        groupId: group.groupId,
        rowNumbers: group.rowNumbers,
        signal: group.signal,
        priority: group.signal === "business_key" || group.signal === "source_id" ? "high" : "high",
      });
    } else {
      recs.push({
        kind: "REVIEW_POSSIBLE_DUPLICATE",
        message: `Review possible duplicate rows (${group.signal.replace(/_/g, " ")}) before import`,
        groupId: group.groupId,
        rowNumbers: group.rowNumbers,
        signal: group.signal,
        priority: "medium",
      });
    }
  }

  return dedupeRecommendations(recs);
}

function dedupeRecommendations(recs: MergeRecommendation[]): MergeRecommendation[] {
  const seen = new Set<string>();
  const out: MergeRecommendation[] = [];
  for (const r of recs) {
    const key = `${r.kind}|${r.groupId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function classifyRecord(
  rowNumber: number,
  businessKey: string,
  memberships: Array<{ groupId: string; signal: DuplicateSignal; classification: DuplicateClassification }>,
): DuplicateRecordResult {
  let classification: DuplicateClassification = "UNIQUE";
  const matchedSignals = new Set<DuplicateSignal>();
  const groupIds: string[] = [];

  for (const m of memberships) {
    groupIds.push(m.groupId);
    matchedSignals.add(m.signal);
    if (classificationRank(m.classification) > classificationRank(classification)) {
      classification = m.classification;
    }
  }

  return {
    rowNumber,
    classification,
    businessKey,
    matchedSignals: [...matchedSignals],
    groupIds,
  };
}

/** Detect duplicate catalog import rows (Phase 3D — in-memory only). */
export function detectCatalogDuplicates(
  records: DuplicateDetectionRecord[],
  config: Partial<DuplicateDetectionConfig> = {},
): DuplicateDetectionReport {
  const cfg = { ...DEFAULT_DUPLICATE_CONFIG, ...config };
  const fingerprints = records.map((r) => buildRecordFingerprints(r, cfg.defaultSegment));

  const allGroups: DuplicateGroup[] = [];
  for (const signal of SIGNALS) {
    allGroups.push(...buildGroups(records, fingerprints, signal));
  }

  const rowMemberships = new Map<
    number,
    Array<{ groupId: string; signal: DuplicateSignal; classification: DuplicateClassification }>
  >();
  for (const group of allGroups) {
    for (const row of group.rowNumbers) {
      const list = rowMemberships.get(row) ?? [];
      list.push({ groupId: group.groupId, signal: group.signal, classification: group.classification });
      rowMemberships.set(row, list);
    }
  }

  const results: DuplicateRecordResult[] = records.map((record, index) => {
    const fp = fingerprints[index]!;
    return classifyRecord(record.rowNumber, fp.businessKey, rowMemberships.get(record.rowNumber) ?? []);
  });

  const duplicateCount = results.filter((r) => r.classification === "DUPLICATE").length;
  const possibleDuplicateCount = results.filter((r) => r.classification === "POSSIBLE_DUPLICATE").length;
  const uniqueCount = results.filter((r) => r.classification === "UNIQUE").length;

  const bySignal: DuplicateDetectionReport["summary"]["bySignal"] = {
    business_key: 0,
    source_id: 0,
    image_url: 0,
    attributes: 0,
    attributes_price: 0,
  };
  for (const g of allGroups) {
    bySignal[g.signal] = (bySignal[g.signal] ?? 0) + 1;
  }

  return {
    checked: true,
    results,
    groups: allGroups,
    mergeRecommendations: buildMergeRecommendations(allGroups),
    summary: {
      totalRecords: records.length,
      duplicateCount,
      possibleDuplicateCount,
      uniqueCount,
      groupCount: allGroups.length,
      bySignal,
    },
  };
}

export function importRecordToDuplicateRecord(record: ImportRecord): DuplicateDetectionRecord | null {
  const standard = importRecordToStandard(record);
  if (!standard) return null;

  const sourceIdRaw = record.fields.sourceId ?? record.fields.source_id ?? record.fields.externalId;

  return {
    ...standard,
    sourceId: sourceIdRaw != null ? String(sourceIdRaw) : null,
  };
}

export function detectDuplicatesFromImportRecords(
  records: ImportRecord[],
  config?: Partial<DuplicateDetectionConfig>,
): DuplicateDetectionReport {
  const detectionRecords = records
    .map(importRecordToDuplicateRecord)
    .filter((r): r is DuplicateDetectionRecord => r !== null);
  return detectCatalogDuplicates(detectionRecords, config);
}

export function toImportDuplicateReport(report: DuplicateDetectionReport) {
  return {
    checked: true as const,
    duplicateCount: report.summary.duplicateCount,
    possibleDuplicateCount: report.summary.possibleDuplicateCount,
    uniqueCount: report.summary.uniqueCount,
    duplicates: report.groups
      .filter((g) => g.signal === "business_key")
      .map((g) => ({ businessKey: g.fingerprint, rowNumbers: g.rowNumbers })),
    groups: report.groups,
    mergeRecommendations: report.mergeRecommendations,
    summary: report.summary,
  };
}
