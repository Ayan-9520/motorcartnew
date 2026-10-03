import type { Lender } from "../types";
import { lenderLogoPath } from "@/data/partner-logos";
import { LENDER_RATE_CARD, PRODUCT_RULES } from "../lib/rate-card";

/**
 * Public lender catalogue built from the published rate card.
 * Used when the `banks` table has no rows yet; DB rows override by slug.
 */
export const LENDER_CATALOG: Lender[] = LENDER_RATE_CARD.map((entry) => {
  const newCar = entry.products.new_car;
  return {
    id: entry.slug,
    name: entry.name,
    slug: entry.slug,
    shortCode: entry.shortCode,
    logoUrl: lenderLogoPath(entry.slug),
    lenderType: entry.lenderType,
    interestRateMin: newCar?.min ?? 0,
    interestRateMax: newCar?.max ?? 0,
    maxTenureMonths: newCar ? PRODUCT_RULES.new_car.maxTenureMonths : PRODUCT_RULES.two_wheeler.maxTenureMonths,
    maxLoanAmount: entry.maxLoanAmount,
    processingFee: entry.feeLabel,
    features: entry.features,
    isFeatured: entry.isFeatured,
    rankingScore: entry.rankingScore,
    minCibil: entry.minCibil,
  };
});

/** @deprecated kept for existing imports — same as LENDER_CATALOG */
export const MOCK_LENDERS: Lender[] = LENDER_CATALOG;
