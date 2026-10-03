import type { DbBank } from "@/types/database";
import type { Lender } from "../types";
import { LENDER_CATALOG } from "../data/lenders";
import { findRateCardEntry } from "./rate-card";

export function mapDbBank(b: DbBank & { ranking_score?: number; min_cibil?: number; short_code?: string }): Lender {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    shortCode: b.short_code ?? b.name.slice(0, 4).toUpperCase(),
    logoUrl: b.logo_url,
    lenderType: (b.bank_type === "nbfc" ? "nbfc" : "bank") as Lender["lenderType"],
    interestRateMin: Number(b.interest_rate_min),
    interestRateMax: Number(b.interest_rate_max),
    maxTenureMonths: b.max_tenure_months,
    maxLoanAmount: Number(b.max_loan_amount),
    processingFee: b.processing_fee,
    features: b.features ?? [],
    isFeatured: b.is_featured,
    rankingScore: b.ranking_score ?? 50,
    minCibil: b.min_cibil ?? 650,
  };
}

/** DB lenders first; catalogue lenders fill gaps (matched by slug or rate-card alias). */
export function mergeLenders(db: Lender[]): Lender[] {
  const covered = new Set(db.map((l) => findRateCardEntry(l.slug)?.slug ?? l.slug));
  const extras = LENDER_CATALOG.filter((m) => !covered.has(m.slug));
  return [...db, ...extras];
}
