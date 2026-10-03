import type { Lender, AiRecommendation, EligibilityInput, LoanOffer } from "../types";
import { calculateEmi, totalInterestPayable } from "./emi-utils";
import { checkEligibility } from "./eligibility";
import {
  PRODUCT_RULES,
  priceForProfile,
  processingFeeWithGst,
  resolveProductRate,
  toLoanProduct,
  type LoanProduct,
} from "./rate-card";

function productOf(input: Pick<EligibilityInput, "product">, product?: string): LoanProduct {
  return toLoanProduct(product ?? input.product);
}

/** Lenders that offer the product, can fund the amount/tenure and accept the CIBIL band — cheapest-for-profile first. */
export function rankLenders(
  lenders: Lender[],
  loanAmount: number,
  tenureMonths: number,
  cibilScore: number,
  product?: string
): Lender[] {
  const p = toLoanProduct(product);
  const maxTenure = PRODUCT_RULES[p].maxTenureMonths;
  return lenders
    .map((l) => ({ l, range: resolveProductRate(l, p) }))
    .filter(
      ({ l, range }) =>
        range != null &&
        loanAmount <= l.maxLoanAmount &&
        tenureMonths <= Math.min(l.maxTenureMonths, maxTenure) &&
        cibilScore >= l.minCibil - 30
    )
    .map(({ l, range }) => ({ l, rate: priceForProfile(range!, cibilScore, tenureMonths) }))
    .sort((a, b) => {
      const scoreA = a.l.rankingScore * 0.15 - a.rate * 3 + (cibilScore >= a.l.minCibil ? 4 : 0);
      const scoreB = b.l.rankingScore * 0.15 - b.rate * 3 + (cibilScore >= b.l.minCibil ? 4 : 0);
      return scoreB - scoreA;
    })
    .map(({ l }) => l);
}

/** Indicative approval chance from lender CIBIL cut-off, FOIR headroom and ticket size. */
export function computeApprovalProbability(
  lender: Lender,
  input: Pick<EligibilityInput, "monthlyIncome" | "cibilScore" | "loanAmount" | "employmentType"> &
    Partial<Pick<EligibilityInput, "existingEmi" | "tenureMonths" | "product" | "vehiclePrice">>,
  emi?: number
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
  lenders: Lender[],
  loanAmount: number,
  tenureMonths: number,
  input: EligibilityInput,
  product?: string
): LoanOffer[] {
  const p = productOf(input, product);
  const ranked = rankLenders(lenders, loanAmount, tenureMonths, input.cibilScore, p);

  return ranked.slice(0, 12).map((lender, i) => {
    const range = resolveProductRate(lender, p)!;
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

export function getAiRecommendations(
  lenders: Lender[],
  loanAmount: number,
  tenureMonths: number,
  input: EligibilityInput,
  limit = 3,
  product?: string
): AiRecommendation[] {
  const offers = buildLoanOffers(lenders, loanAmount, tenureMonths, input, product);
  if (!offers.length) return [];
  const cheapest = Math.min(...offers.map((o) => o.totalCost ?? o.emi * tenureMonths));

  return offers
    .map((offer) => {
      const cost = offer.totalCost ?? offer.emi * tenureMonths;
      const costScore = Math.max(0, 100 - ((cost - cheapest) / cheapest) * 400);
      const score = Math.round(offer.approvalProbability * 0.45 + costScore * 0.45 + offer.rankingScore * 0.1);
      return { offer, score, cost };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ offer, score, cost }, i) => {
      const reasons: string[] = [];
      if (cost === cheapest) reasons.push("Lowest total cost incl. processing fee");
      if (offer.approvalProbability >= 75) reasons.push("Strong approval chance for your profile");
      reasons.push(`~${offer.effectiveRate}% for CIBIL ${input.cibilScore}`);
      if (input.cibilScore >= offer.minCibil) reasons.push("Meets lender CIBIL cut-off");
      if (i === 0 && reasons.length < 4 && offer.isFeatured) reasons.push("Large lender with fast disbursal");
      return {
        lender: offer,
        score,
        reasons: reasons.slice(0, 4),
        approvalProbability: offer.approvalProbability,
        estimatedEmi: offer.emi,
      };
    });
}

export interface RefinanceCharges {
  /** Foreclosure % charged by the current lender on outstanding principal */
  foreclosurePct?: number;
  /** Processing fee % charged by the new lender */
  newProcessingPct?: number;
}

export function getRefinanceSavings(
  outstanding: number,
  currentRate: number,
  remainingMonths: number,
  newRate: number,
  newTenure: number,
  charges: RefinanceCharges = {}
): {
  currentEmi: number;
  newEmi: number;
  monthlySavings: number;
  totalSavings: number;
  switchingCost: number;
  netSavings: number;
  breakEvenMonths: number | null;
} {
  const foreclosurePct = charges.foreclosurePct ?? 4;
  const newProcessingPct = charges.newProcessingPct ?? 1;
  const currentEmi = calculateEmi(outstanding, currentRate, remainingMonths);
  const newEmi = calculateEmi(outstanding, newRate, newTenure);
  const monthlySavings = Math.max(0, currentEmi - newEmi);
  const switchingCost = Math.round(
    outstanding * (foreclosurePct / 100) * 1.18 + outstanding * (newProcessingPct / 100) * 1.18
  );
  const totalSavings = Math.max(0, currentEmi * remainingMonths - newEmi * newTenure);
  const netSavings = totalSavings - switchingCost;
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(switchingCost / monthlySavings) : null;
  return { currentEmi, newEmi, monthlySavings, totalSavings, switchingCost, netSavings, breakEvenMonths };
}
