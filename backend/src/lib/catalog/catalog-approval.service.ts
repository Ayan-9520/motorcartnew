import {
  buildCatalogKnowledge,
  buildHighlights,
  buildRecommendations,
  detectRowIssues,
} from "./approval-anomalies";
import { mergeApprovalConfig, resolveApprovalState } from "./approval-rules";
import type {
  ApprovalBreakdownBucket,
  CatalogApprovalConfig,
  CatalogApprovalInput,
  CatalogApprovalReport,
  CatalogApprovalRow,
  CatalogApprovalSummary,
  ListingApprovalContext,
} from "./approval-types";
import { DEFAULT_APPROVAL_CONFIG } from "./approval-types";
import type { CatalogVariantRecord } from "./types";

function emptyBucket(): ApprovalBreakdownBucket {
  return { total: 0, autoApproved: 0, manualReview: 0, rejected: 0 };
}

function bumpBucket(bucket: ApprovalBreakdownBucket, state: CatalogApprovalRow["approvalState"]): void {
  bucket.total++;
  if (state === "AUTO_APPROVED") bucket.autoApproved++;
  else if (state === "MANUAL_REVIEW") bucket.manualReview++;
  else bucket.rejected++;
}

function buildBreakdowns(rows: CatalogApprovalRow[]) {
  const byBrand: Record<string, ApprovalBreakdownBucket> = {};
  const byModel: Record<string, ApprovalBreakdownBucket> = {};
  const byDealer: Record<string, ApprovalBreakdownBucket> = {};
  const byCity: Record<string, ApprovalBreakdownBucket> = {};
  const bySource: Record<string, ApprovalBreakdownBucket> = {
    vehicles: emptyBucket(),
    new_car_inventory: emptyBucket(),
  };

  for (const row of rows) {
    const brandKey = row.brand.trim() || "Unknown";
    const modelKey = `${brandKey}|${row.model.trim() || "Unknown"}`;
    const dealerKey = row.dealerName ?? row.dealerId ?? "Unknown dealer";
    const cityKey = row.city ?? "Unknown city";

    byBrand[brandKey] ??= emptyBucket();
    byModel[modelKey] ??= emptyBucket();
    byDealer[dealerKey] ??= emptyBucket();
    byCity[cityKey] ??= emptyBucket();
    bySource[row.source] ??= emptyBucket();

    bumpBucket(byBrand[brandKey]!, row.approvalState);
    bumpBucket(byModel[modelKey]!, row.approvalState);
    bumpBucket(byDealer[dealerKey]!, row.approvalState);
    bumpBucket(byCity[cityKey]!, row.approvalState);
    bumpBucket(bySource[row.source]!, row.approvalState);
  }

  return {
    byBrand,
    byModel,
    byDealer,
    byCity,
    bySource: bySource as CatalogApprovalReport["breakdown"]["bySource"],
  };
}

function buildSummary(rows: CatalogApprovalRow[], recommendationCount: number): CatalogApprovalSummary {
  const summary: CatalogApprovalSummary = {
    totalListings: rows.length,
    autoApproved: 0,
    manualReview: 0,
    rejected: 0,
    issueCount: 0,
    recommendationCount,
  };

  for (const row of rows) {
    summary.issueCount += row.issues.length;
    switch (row.approvalState) {
      case "AUTO_APPROVED":
        summary.autoApproved++;
        break;
      case "MANUAL_REVIEW":
        summary.manualReview++;
        break;
      case "REJECTED":
        summary.rejected++;
        break;
    }
  }

  return summary;
}

function contextMap(context: ListingApprovalContext[] | undefined): Map<string, ListingApprovalContext> {
  const map = new Map<string, ListingApprovalContext>();
  for (const c of context ?? []) {
    map.set(c.listingId, c);
  }
  return map;
}

/**
 * Catalog Review & Approval Engine (Phase 2D — dry run only).
 * Consumes Phase 2C linking output. Never writes to the database.
 */
export class CatalogApprovalService {
  constructor(
    private readonly catalog: CatalogVariantRecord[],
    private readonly config: CatalogApprovalConfig = DEFAULT_APPROVAL_CONFIG,
  ) {}

  review(input: CatalogApprovalInput): CatalogApprovalReport {
    const config = mergeApprovalConfig(this.config);
    const knowledge = buildCatalogKnowledge(this.catalog);
    const ctxMap = contextMap(input.listingContext);

    const contextByListing = new Map<string, { fuel?: string | null; transmission?: string | null }>();
    for (const [id, ctx] of ctxMap) {
      contextByListing.set(id, { fuel: ctx.fuel, transmission: ctx.transmission });
    }

    const highlights = buildHighlights(input.linkReport.rows, knowledge, contextByListing);
    const globalRecommendations = buildRecommendations(input.linkReport.rows, highlights);

    const rows: CatalogApprovalRow[] = input.linkReport.rows.map((linkRow) => {
      const ctx = ctxMap.get(linkRow.listingId);
      const { state, reason } = resolveApprovalState(linkRow, config);
      const issues = detectRowIssues(linkRow, knowledge, ctx?.fuel, ctx?.transmission);
      const recommendations = buildRecommendations([linkRow], {
        ...highlights,
        duplicateBusinessKeys: [],
        conflictingVariants: linkRow.matchStatus === "MULTIPLE_MATCHES" ? [{ listingId: linkRow.listingId, candidateVariantIds: linkRow.candidateVariantIds ?? [] }] : [],
        missingCatalogModels: issues.some((i) => i.type === "MISSING_CATALOG_MODEL")
          ? [{ brand: linkRow.brand, model: linkRow.model, listingIds: [linkRow.listingId] }]
          : [],
        unknownBrands: issues.some((i) => i.type === "UNKNOWN_BRAND")
          ? [{ brand: linkRow.brand, listingIds: [linkRow.listingId] }]
          : [],
        unknownFuels: issues.some((i) => i.type === "UNKNOWN_FUEL")
          ? [{ fuel: ctx?.fuel ?? "unknown", listingIds: [linkRow.listingId] }]
          : [],
        unknownTransmissions: issues.some((i) => i.type === "UNKNOWN_TRANSMISSION")
          ? [{ transmission: ctx?.transmission ?? "unknown", listingIds: [linkRow.listingId] }]
          : [],
      });

      return {
        ...linkRow,
        approvalState: state,
        approvalReason: reason,
        dealerId: ctx?.dealerId ?? null,
        dealerName: ctx?.dealerName ?? null,
        city: ctx?.city ?? null,
        issues,
        recommendations,
      };
    });

    const recommendations = dedupeReportRecommendations([...globalRecommendations, ...rows.flatMap((r) => r.recommendations)]);

    return {
      generatedAt: new Date().toISOString(),
      dryRun: true,
      sourceReportGeneratedAt: input.linkReport.generatedAt,
      config,
      summary: buildSummary(rows, recommendations.length),
      breakdown: buildBreakdowns(rows),
      highlights,
      recommendations,
      rows,
    };
  }
}

function dedupeReportRecommendations(recs: CatalogApprovalReport["recommendations"]) {
  const seen = new Set<string>();
  const out: CatalogApprovalReport["recommendations"] = [];
  for (const r of recs) {
    const key = `${r.kind}|${r.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export function createCatalogApprovalService(
  catalog: CatalogVariantRecord[],
  config?: Partial<CatalogApprovalConfig>,
): CatalogApprovalService {
  return new CatalogApprovalService(catalog, mergeApprovalConfig(config));
}
