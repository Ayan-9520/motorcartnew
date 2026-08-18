import type { CatalogMatchingService } from "./catalog-matching.service";
import { listingToMatchInput } from "./listing-mapper";
import type {
  CatalogLinkReport,
  CatalogLinkRow,
  CatalogLinkStatus,
  CatalogLinkSummary,
  CatalogLinkingConfig,
  ListingRecord,
} from "./linking-types";
import { DEFAULT_LINKING_CONFIG as DEFAULT_CONFIG } from "./linking-types";
import type { CatalogMatchResult } from "./types";

function emptySourceSummary(): CatalogLinkSummary["bySource"]["vehicles"] {
  return { totalListings: 0, matched: 0, multiple: 0, lowConfidence: 0, noMatch: 0 };
}

function reasonForStatus(status: CatalogLinkStatus, candidates: CatalogMatchResult[]): string {
  if (status === "NO_MATCH") {
    const method = candidates[0]?.method ?? "none";
    if (method === "none") return "No catalog variant matched segment, brand, model, variant, fuel, transmission, and year";
    return "No acceptable catalog match";
  }
  if (status === "MULTIPLE_MATCHES") {
    const ids = candidates.map((c) => c.catalogVariantId).filter(Boolean);
    return `Ambiguous: ${ids.length} catalog variants tied at the same match tier (${candidates[0]?.method ?? "unknown"})`;
  }
  if (status === "LOW_CONFIDENCE") {
    return `Fuzzy variant match only (confidence ${candidates[0]?.confidence ?? 60})`;
  }
  const primary = candidates[0]!;
  return `${primary.method} match at confidence ${primary.confidence}`;
}

function classifyCandidates(
  candidates: CatalogMatchResult[],
  config: CatalogLinkingConfig,
): { status: CatalogLinkStatus; confidence: CatalogLinkRow["confidence"] } {
  const viable = candidates.filter((c) => c.method !== "none" && c.catalogVariantId);
  if (viable.length === 0) {
    return { status: "NO_MATCH", confidence: 0 };
  }
  if (viable.length > 1) {
    return { status: "MULTIPLE_MATCHES", confidence: viable[0]!.confidence };
  }
  const primary = viable[0]!;
  if (primary.confidence === config.fuzzyConfidence) {
    return { status: "LOW_CONFIDENCE", confidence: primary.confidence };
  }
  if (primary.confidence >= config.matchedMinConfidence) {
    return { status: "MATCHED", confidence: primary.confidence };
  }
  return { status: "LOW_CONFIDENCE", confidence: primary.confidence };
}

function buildSummary(rows: CatalogLinkRow[]): CatalogLinkSummary {
  const summary: CatalogLinkSummary = {
    totalListings: rows.length,
    matched: 0,
    multiple: 0,
    lowConfidence: 0,
    noMatch: 0,
    bySource: {
      vehicles: emptySourceSummary(),
      newCarInventory: emptySourceSummary(),
    },
  };

  for (const row of rows) {
    const bucket = row.source === "vehicles" ? summary.bySource.vehicles : summary.bySource.newCarInventory;
    bucket.totalListings++;

    switch (row.matchStatus) {
      case "MATCHED":
        summary.matched++;
        bucket.matched++;
        break;
      case "MULTIPLE_MATCHES":
        summary.multiple++;
        bucket.multiple++;
        break;
      case "LOW_CONFIDENCE":
        summary.lowConfidence++;
        bucket.lowConfidence++;
        break;
      case "NO_MATCH":
        summary.noMatch++;
        bucket.noMatch++;
        break;
    }
  }

  return summary;
}

/**
 * Catalog Linking Service (Phase 2C — dry run only).
 * Analyzes marketplace listings against the catalog index. Never writes to the database.
 */
export class CatalogLinkingService {
  constructor(
    private readonly matcher: CatalogMatchingService,
    private readonly config: CatalogLinkingConfig = DEFAULT_CONFIG,
  ) {}

  analyzeListing(listing: ListingRecord): CatalogLinkRow {
    const matchInput = listingToMatchInput(listing);
    if (!matchInput) {
      return {
        listingId: listing.id,
        source: listing.source,
        brand: listing.brand,
        model: listing.model,
        variant: listing.variant,
        matchStatus: "NO_MATCH",
        confidence: 0,
        catalogVariantId: null,
        businessKey: null,
        matchMethod: null,
        reason: "Missing required brand or model on listing",
      };
    }

    const candidates = this.matcher.matchCandidates(matchInput);
    const { status, confidence } = classifyCandidates(candidates, this.config);
    const primary = candidates.find((c) => c.method !== "none" && c.catalogVariantId) ?? candidates[0]!;

    const row: CatalogLinkRow = {
      listingId: listing.id,
      source: listing.source,
      brand: listing.brand,
      model: listing.model,
      variant: listing.variant,
      matchStatus: status,
      confidence,
      catalogVariantId: status === "MULTIPLE_MATCHES" ? null : (primary?.catalogVariantId ?? null),
      businessKey: status === "MULTIPLE_MATCHES" ? null : (primary?.businessKey ?? null),
      matchMethod: status === "MULTIPLE_MATCHES" ? null : (primary?.method ?? null),
      reason: reasonForStatus(status, candidates.filter((c) => c.method !== "none")),
    };

    if (status === "MULTIPLE_MATCHES") {
      row.candidateVariantIds = candidates
        .map((c) => c.catalogVariantId)
        .filter((id): id is string => Boolean(id));
    }

    return row;
  }

  analyzeListings(listings: ListingRecord[]): CatalogLinkRow[] {
    return listings.map((listing) => this.analyzeListing(listing));
  }

  buildReport(listings: ListingRecord[]): CatalogLinkReport {
    const rows = this.analyzeListings(listings);
    return {
      generatedAt: new Date().toISOString(),
      dryRun: true,
      summary: buildSummary(rows),
      rows,
    };
  }
}

export function createCatalogLinkingService(
  matcher: CatalogMatchingService,
  config?: Partial<CatalogLinkingConfig>,
): CatalogLinkingService {
  return new CatalogLinkingService(matcher, { ...DEFAULT_CONFIG, ...config });
}

export { buildSummary };
