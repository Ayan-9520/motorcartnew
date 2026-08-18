/** Internal catalog review & approval types (Phase 2D — dry run only). */

import type { CatalogLinkReport, CatalogLinkRow, ListingSource } from "./linking-types";

export type ApprovalState = "AUTO_APPROVED" | "MANUAL_REVIEW" | "REJECTED";

export type ApprovalIssueType =
  | "DUPLICATE_BUSINESS_KEY"
  | "CONFLICTING_VARIANTS"
  | "MISSING_CATALOG_MODEL"
  | "UNKNOWN_BRAND"
  | "UNKNOWN_FUEL"
  | "UNKNOWN_TRANSMISSION";

export type RecommendationKind =
  | "CREATE_CATALOG_VARIANT"
  | "MERGE_DUPLICATE"
  | "CREATE_ALIAS"
  | "UPDATE_NORMALIZATION";

export type ApprovalIssue = {
  type: ApprovalIssueType;
  message: string;
  listingId?: string;
  businessKey?: string;
};

export type ApprovalRecommendation = {
  kind: RecommendationKind;
  message: string;
  listingId?: string;
  brand?: string;
  model?: string;
  priority: "high" | "medium" | "low";
};

export type CatalogApprovalConfig = {
  /** Confidence >= this → AUTO_APPROVED. Default: 98 */
  autoApproveMinConfidence: number;
  /** Confidence >= this (and < auto) → MANUAL_REVIEW. Default: 80 */
  manualReviewMinConfidence: number;
  /** MULTIPLE_MATCHES always routes to MANUAL_REVIEW when true. Default: true */
  forceManualReviewOnMultipleMatches: boolean;
  /** NO_MATCH / LOW_CONFIDENCE always REJECTED when true. Default: true */
  forceRejectOnWeakMatch: boolean;
};

export const DEFAULT_APPROVAL_CONFIG: CatalogApprovalConfig = {
  autoApproveMinConfidence: 98,
  manualReviewMinConfidence: 80,
  forceManualReviewOnMultipleMatches: true,
  forceRejectOnWeakMatch: true,
};

export type ListingApprovalContext = {
  listingId: string;
  dealerId?: string | null;
  dealerName?: string | null;
  city?: string | null;
  fuel?: string | null;
  transmission?: string | null;
};

export type ApprovalBreakdownBucket = {
  total: number;
  autoApproved: number;
  manualReview: number;
  rejected: number;
};

export type CatalogApprovalRow = CatalogLinkRow & {
  approvalState: ApprovalState;
  approvalReason: string;
  dealerId: string | null;
  dealerName: string | null;
  city: string | null;
  issues: ApprovalIssue[];
  recommendations: ApprovalRecommendation[];
};

export type CatalogApprovalHighlights = {
  duplicateBusinessKeys: Array<{ businessKey: string; variantIds: string[]; count: number }>;
  conflictingVariants: Array<{ listingId: string; candidateVariantIds: string[] }>;
  missingCatalogModels: Array<{ brand: string; model: string; listingIds: string[] }>;
  unknownBrands: Array<{ brand: string; listingIds: string[] }>;
  unknownFuels: Array<{ fuel: string; listingIds: string[] }>;
  unknownTransmissions: Array<{ transmission: string; listingIds: string[] }>;
};

export type CatalogApprovalSummary = {
  totalListings: number;
  autoApproved: number;
  manualReview: number;
  rejected: number;
  issueCount: number;
  recommendationCount: number;
};

export type CatalogApprovalReport = {
  generatedAt: string;
  dryRun: true;
  sourceReportGeneratedAt: string;
  config: CatalogApprovalConfig;
  summary: CatalogApprovalSummary;
  breakdown: {
    byBrand: Record<string, ApprovalBreakdownBucket>;
    byModel: Record<string, ApprovalBreakdownBucket>;
    byDealer: Record<string, ApprovalBreakdownBucket>;
    byCity: Record<string, ApprovalBreakdownBucket>;
    bySource: Record<ListingSource, ApprovalBreakdownBucket>;
  };
  highlights: CatalogApprovalHighlights;
  recommendations: ApprovalRecommendation[];
  rows: CatalogApprovalRow[];
};

export type CatalogApprovalInput = {
  linkReport: CatalogLinkReport;
  listingContext?: ListingApprovalContext[];
};
