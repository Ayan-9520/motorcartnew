import type { ApprovalBreakdownBucket, CatalogApprovalReport, CatalogApprovalRow } from "./approval-types";

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CSV_HEADERS = [
  "listing_id",
  "source",
  "brand",
  "model",
  "variant",
  "match_status",
  "confidence",
  "approval_state",
  "approval_reason",
  "catalog_variant_id",
  "business_key",
  "dealer_id",
  "dealer_name",
  "city",
  "issues",
  "recommendations",
] as const;

function rowToCsv(row: CatalogApprovalRow): string {
  return [
    row.listingId,
    row.source,
    row.brand,
    row.model,
    row.variant,
    row.matchStatus,
    row.confidence,
    row.approvalState,
    row.approvalReason,
    row.catalogVariantId,
    row.businessKey,
    row.dealerId,
    row.dealerName,
    row.city,
    row.issues.map((i) => i.type).join(";"),
    row.recommendations.map((r) => r.kind).join(";"),
  ]
    .map(escapeCsvField)
    .join(",");
}

export function catalogApprovalReportToCsv(report: CatalogApprovalReport): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const row of report.rows) lines.push(rowToCsv(row));
  return lines.join("\n");
}

export function catalogApprovalReportToJson(report: CatalogApprovalReport, pretty = true): string {
  return JSON.stringify(report, null, pretty ? 2 : undefined);
}

function breakdownTable(title: string, entries: Record<string, ApprovalBreakdownBucket>): string {
  const rows = Object.entries(entries)
    .sort((a, b) => b[1].total - a[1].total)
    .map(
      ([key, b]) =>
        `<tr><td>${escapeHtml(key)}</td><td>${b.total}</td><td>${b.autoApproved}</td><td>${b.manualReview}</td><td>${b.rejected}</td></tr>`,
    )
    .join("");
  if (!rows) return "";
  return `<section><h2>${escapeHtml(title)}</h2><table><thead><tr><th>Key</th><th>Total</th><th>Auto</th><th>Review</th><th>Rejected</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

export function catalogApprovalReportToHtml(report: CatalogApprovalReport): string {
  const s = report.summary;
  const h = report.highlights;

  const listingRows = report.rows
    .slice(0, 500)
    .map(
      (r) =>
        `<tr class="${r.approvalState.toLowerCase()}"><td>${escapeHtml(r.listingId)}</td><td>${escapeHtml(r.source)}</td><td>${escapeHtml(r.brand)}</td><td>${escapeHtml(r.model)}</td><td>${escapeHtml(r.variant ?? "")}</td><td>${r.confidence}</td><td>${escapeHtml(r.approvalState)}</td><td>${escapeHtml(r.matchStatus)}</td><td>${escapeHtml(r.approvalReason)}</td></tr>`,
    )
    .join("");

  const recItems = report.recommendations
    .map((r) => `<li><strong>${escapeHtml(r.kind)}</strong> (${r.priority}): ${escapeHtml(r.message)}</li>`)
    .join("");

  const highlightBlock = [
    h.duplicateBusinessKeys.length
      ? `<li>Duplicate business keys: ${h.duplicateBusinessKeys.length}</li>`
      : "",
    h.conflictingVariants.length ? `<li>Conflicting variants: ${h.conflictingVariants.length}</li>` : "",
    h.missingCatalogModels.length ? `<li>Missing catalog models: ${h.missingCatalogModels.length}</li>` : "",
    h.unknownBrands.length ? `<li>Unknown brands: ${h.unknownBrands.length}</li>` : "",
    h.unknownFuels.length ? `<li>Unknown fuel types: ${h.unknownFuels.length}</li>` : "",
    h.unknownTransmissions.length ? `<li>Unknown transmissions: ${h.unknownTransmissions.length}</li>` : "",
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Motorcart Catalog Approval Report (Dry Run)</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 1.4rem; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0 24px; font-size: 0.85rem; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
    .stat { background: #fafafa; border: 1px solid #eee; padding: 12px; border-radius: 6px; }
    .auto_approved { background: #f0fdf4; }
    .manual_review { background: #fffbeb; }
    .rejected { background: #fef2f2; }
    .meta { color: #555; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Catalog Review &amp; Approval Report</h1>
  <p class="meta">Generated ${escapeHtml(report.generatedAt)} · Source linking report ${escapeHtml(report.sourceReportGeneratedAt)} · <strong>Dry run — no database writes</strong></p>

  <div class="stats">
    <div class="stat"><strong>Total</strong><br/>${s.totalListings}</div>
    <div class="stat"><strong>Auto approved</strong><br/>${s.autoApproved}</div>
    <div class="stat"><strong>Manual review</strong><br/>${s.manualReview}</div>
    <div class="stat"><strong>Rejected</strong><br/>${s.rejected}</div>
    <div class="stat"><strong>Issues</strong><br/>${s.issueCount}</div>
    <div class="stat"><strong>Recommendations</strong><br/>${s.recommendationCount}</div>
  </div>

  <section>
    <h2>Highlights</h2>
    <ul>${highlightBlock || "<li>No critical highlights</li>"}</ul>
  </section>

  <section>
    <h2>Recommendations</h2>
    <ul>${recItems || "<li>None</li>"}</ul>
  </section>

  ${breakdownTable("By Brand", report.breakdown.byBrand)}
  ${breakdownTable("By Model", report.breakdown.byModel)}
  ${breakdownTable("By Dealer", report.breakdown.byDealer)}
  ${breakdownTable("By City", report.breakdown.byCity)}
  ${breakdownTable("By Source", report.breakdown.bySource)}

  <section>
    <h2>Listings (first ${Math.min(report.rows.length, 500)})</h2>
    <table>
      <thead><tr><th>ID</th><th>Source</th><th>Brand</th><th>Model</th><th>Variant</th><th>Conf</th><th>Approval</th><th>Match</th><th>Reason</th></tr></thead>
      <tbody>${listingRows}</tbody>
    </table>
  </section>
</body>
</html>`;
}

export function formatApprovalSummaryText(report: CatalogApprovalReport): string {
  const s = report.summary;
  const h = report.highlights;
  return [
    "=== Catalog Approval Dry Run Summary ===",
    `Generated : ${report.generatedAt}`,
    `Source    : linking report ${report.sourceReportGeneratedAt}`,
    `Dry run   : yes (no database writes)`,
    "",
    `Total listings : ${s.totalListings}`,
    `Auto approved  : ${s.autoApproved}`,
    `Manual review  : ${s.manualReview}`,
    `Rejected       : ${s.rejected}`,
    "",
    "Highlights:",
    `  Duplicate business keys : ${h.duplicateBusinessKeys.length}`,
    `  Conflicting variants    : ${h.conflictingVariants.length}`,
    `  Missing catalog models  : ${h.missingCatalogModels.length}`,
    `  Unknown brands          : ${h.unknownBrands.length}`,
    `  Unknown fuel types      : ${h.unknownFuels.length}`,
    `  Unknown transmissions   : ${h.unknownTransmissions.length}`,
    "",
    `Recommendations: ${s.recommendationCount}`,
  ].join("\n");
}
