import { calculateEmi, totalInterestPayable } from "./emi";
import { checkEligibility, type EligibilityInput } from "./eligibility";
import {
  PRODUCT_RULES,
  priceForProfile,
  processingFeeWithGst,
  resolveProductRate,
  toLoanProduct,
} from "./rate-card";

export type LenderSnapshot = {
  id: string;
  /** Used to look up product-wise published rates; falls back to new-car range + spread */
  slug?: string;
  lenderType?: string;
  rankingScore: number;
  minCibil: number;
  interestRateMin: number;
  interestRateMax: number;
  maxTenureMonths: number;
  maxLoanAmount: number;
};

export type LoanOfferSnapshot = LenderSnapshot & {
  effectiveRate: number;
  emi: number;
  totalInterest: number;
  approvalProbability: number;
  rank: number;
  productRateMin: number;
  productRateMax: number;
  rateEstimated: boolean;
  processingFeeAmount: number;
  totalCost: number;
};

function rateBase(l: LenderSnapshot) {
  return { slug: l.slug ?? l.id, interestRateMin: l.interestRateMin, interestRateMax: l.interestRateMax };
}

/** Server copy of frontend/src/features/finance/lib/ai-engine.ts ranking — keep in sync. */
export function rankLenders(
  lenders: LenderSnapshot[],
  loanAmount: number,
  tenureMonths: number,
  cibilScore: number,
  product?: string,
): LenderSnapshot[] {
  const p = toLoanProduct(product);
  const maxTenure = PRODUCT_RULES[p].maxTenureMonths;
  return lenders
    .map((l) => ({ l, range: resolveProductRate(rateBase(l), p) }))
    .filter(
      ({ l, range }) =>
        range != null &&
        loanAmount <= l.maxLoanAmount &&
        tenureMonths <= Math.min(l.maxTenureMonths, maxTenure) &&
        cibilScore >= l.minCibil - 30,
    )
    .map(({ l, range }) => ({ l, rate: priceForProfile(range!, cibilScore, tenureMonths) }))
    .sort((a, b) => {
      const scoreA = a.l.rankingScore * 0.15 - a.rate * 3 + (cibilScore >= a.l.minCibil ? 4 : 0);
      const scoreB = b.l.rankingScore * 0.15 - b.rate * 3 + (cibilScore >= b.l.minCibil ? 4 : 0);
      return scoreB - scoreA;
    })
    .map(({ l }) => l);
}

export function computeApprovalProbability(
  lender: LenderSnapshot,
  input: Pick<EligibilityInput, "monthlyIncome" | "cibilScore" | "loanAmount" | "employmentType"> &
    Partial<Pick<EligibilityInput, "existingEmi" | "tenureMonths" | "product" | "vehiclePrice">>,
  emi?: number,
): number {
  const elig = checkEligibility({
    ...input,
    existingEmi: input.existingEmi ?? 0,
    tenureMonths: input.tenureMonths ?? 60,
  });

  let prob = 25;
  if (input.cibilScore >= lender.minCibil + 75) prob += 25;
  else if (input.cibilScore >= lender.minCibil) prob += 18;
  else if (input.cibilScore >= lender.minCibil - 30) prob += 5;

  if (emi && input.monthlyIncome > 0) {
    const foirUsed = ((input.existingEmi ?? 0) + emi) / input.monthlyIncome;
    if (foirUsed <= 0.35) prob += 15;
    else if (foirUsed <= 0.5) prob += 8;
    else if (foirUsed > 0.6) prob -= 15;
  }

  if (input.loanAmount <= lender.maxLoanAmount * 0.5) prob += 4;
  if (elig.eligible) prob += 6;
  if (input.employmentType === "salaried") prob += 3;
  if (lender.lenderType === "nbfc" && input.cibilScore < 700) prob += 6;

  return Math.min(90, Math.max(10, Math.round(prob)));
}

export function buildLoanOffers(
  lenders: LenderSnapshot[],
  loanAmount: number,
  tenureMonths: number,
  input: EligibilityInput,
  product?: string,
): LoanOfferSnapshot[] {
  const p = toLoanProduct(product ?? input.product);
  const ranked = rankLenders(lenders, loanAmount, tenureMonths, input.cibilScore, p);

  return ranked.slice(0, 12).map((lender, i) => {
    const range = resolveProductRate(rateBase(lender), p)!;
    const effectiveRate = priceForProfile(range, input.cibilScore, tenureMonths);
    const emi = calculateEmi(loanAmount, effectiveRate, tenureMonths);
    const processingFeeAmount = processingFeeWithGst(range.fee, loanAmount);
    return {
      ...lender,
      effectiveRate,
      emi,
      totalInterest: totalInterestPayable(emi, tenureMonths, loanAmount),
      approvalProbability: computeApprovalProbability(lender, { ...input, loanAmount, tenureMonths, product: p }, emi),
      rank: i + 1,
      productRateMin: range.min,
      productRateMax: range.max,
      rateEstimated: range.estimated,
      processingFeeAmount,
      totalCost: emi * tenureMonths + processingFeeAmount,
    };
  });
}
