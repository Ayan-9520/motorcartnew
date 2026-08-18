import type { DuplicateDetectionReport } from "./duplicate-types";

function csvEscape(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** CSV report: one row per duplicate group. */
export function duplicateGroupsToCsv(report: DuplicateDetectionReport): string {
  const header = [
    "groupId",
    "signal",
    "classification",
    "fingerprint",
    "rowNumbers",
    "recordCount",
  ].join(",");

  const rows = report.groups.map((g) =>
    [
      csvEscape(g.groupId),
      csvEscape(g.signal),
      csvEscape(g.classification),
      csvEscape(g.fingerprint),
      csvEscape(g.rowNumbers.join(";")),
      csvEscape(g.rowNumbers.length),
    ].join(","),
  );

  return [header, ...rows].join("\n");
}

/** CSV report: one row per import record classification. */
export function duplicateResultsToCsv(report: DuplicateDetectionReport): string {
  const header = ["rowNumber", "classification", "businessKey", "matchedSignals", "groupIds"].join(",");

  const rows = report.results.map((r) =>
    [
      csvEscape(r.rowNumber),
      csvEscape(r.classification),
      csvEscape(r.businessKey),
      csvEscape(r.matchedSignals.join(";")),
      csvEscape(r.groupIds.join(";")),
    ].join(","),
  );

  return [header, ...rows].join("\n");
}

/** CSV report: merge recommendations. */
export function mergeRecommendationsToCsv(report: DuplicateDetectionReport): string {
  const header = ["kind", "priority", "signal", "groupId", "rowNumbers", "message"].join(",");

  const rows = report.mergeRecommendations.map((r) =>
    [
      csvEscape(r.kind),
      csvEscape(r.priority),
      csvEscape(r.signal),
      csvEscape(r.groupId),
      csvEscape(r.rowNumbers.join(";")),
      csvEscape(r.message),
    ].join(","),
  );

  return [header, ...rows].join("\n");
}

export function duplicateReportToJson(report: DuplicateDetectionReport): string {
  return JSON.stringify(report, null, 2);
}

export type DuplicateReportBundle = {
  summary: DuplicateDetectionReport["summary"];
  groupsCsv: string;
  resultsCsv: string;
  mergeCsv: string;
  json: string;
};

export function buildDuplicateReportBundle(report: DuplicateDetectionReport): DuplicateReportBundle {
  return {
    summary: report.summary,
    groupsCsv: duplicateGroupsToCsv(report),
    resultsCsv: duplicateResultsToCsv(report),
    mergeCsv: mergeRecommendationsToCsv(report),
    json: duplicateReportToJson(report),
  };
}
