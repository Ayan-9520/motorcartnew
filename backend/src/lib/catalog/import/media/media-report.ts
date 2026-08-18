import type { MediaPipelineReport } from "./media-types";

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** CSV report: one row per processed media item. */
export function mediaItemsToCsv(report: MediaPipelineReport): string {
  const header = [
    "rowNumber",
    "field",
    "kind",
    "url",
    "category",
    "errorCode",
    "errorMessage",
    "detectedFormat",
    "width",
    "height",
    "byteLength",
    "sha256",
    "duplicateOfRow",
    "duplicateOfUrl",
  ].join(",");

  const rows = report.items.map((item) =>
    [
      csvEscape(item.rowNumber),
      csvEscape(item.field),
      csvEscape(item.kind),
      csvEscape(item.url),
      csvEscape(item.category),
      csvEscape(item.errorCode ?? ""),
      csvEscape(item.errorMessage ?? ""),
      csvEscape(item.metadata?.detectedFormat ?? ""),
      csvEscape(item.metadata?.width ?? ""),
      csvEscape(item.metadata?.height ?? ""),
      csvEscape(item.metadata?.byteLength ?? ""),
      csvEscape(item.metadata?.sha256 ?? ""),
      csvEscape(item.duplicateOf?.rowNumber ?? ""),
      csvEscape(item.duplicateOf?.url ?? ""),
    ].join(","),
  );

  return [header, ...rows].join("\n");
}

/** CSV report: summary counts. */
export function mediaSummaryToCsv(report: MediaPipelineReport): string {
  const header = "metric,value";
  const s = report.summary;
  const rows = [
    ["totalItems", s.totalItems],
    ["validImageCount", s.validImageCount],
    ["invalidImageCount", s.invalidImageCount],
    ["duplicateImageCount", s.duplicateImageCount],
    ["brokenUrlCount", s.brokenUrlCount],
    ["unsupportedFormatCount", s.unsupportedFormatCount],
    ["validBrochureCount", s.validBrochureCount],
    ["validVideoCount", s.validVideoCount],
  ].map(([metric, value]) => `${csvEscape(metric)},${csvEscape(value)}`);

  return [header, ...rows].join("\n");
}

export function mediaReportToJson(report: MediaPipelineReport): string {
  return JSON.stringify(report, null, 2);
}

export type MediaReportBundle = {
  summary: MediaPipelineReport["summary"];
  itemsCsv: string;
  summaryCsv: string;
  json: string;
};

export function buildMediaReportBundle(report: MediaPipelineReport): MediaReportBundle {
  return {
    summary: report.summary,
    itemsCsv: mediaItemsToCsv(report),
    summaryCsv: mediaSummaryToCsv(report),
    json: mediaReportToJson(report),
  };
}
