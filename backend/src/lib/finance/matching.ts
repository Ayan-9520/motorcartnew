import { calculateEmi, totalInterestPayable } from "./emi";
import { checkEligibility, type EligibilityInput } from "./eligibility";

export type LenderSnapshot = {
  id: string;
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
};

export function rankLenders(
  lenders: LenderSnapshot[],
  loanAmount: number,
  tenureMonths: number,
  cibilScore: number,
): LenderSnapshot[] {
  return [...lenders]
    .filter(
      (l) =>
        loanAmount <= l.maxLoanAmount &&
        tenureMonths <= l.maxTenureMonths &&
        cibilScore >= l.minCibil - 30,
    )
    .sort((a, b) => {
      const rateA = (a.interestRateMin + a.interestRateMax) / 2;
      const rateB = (b.interestRateMin + b.interestRateMax) / 2;
      const scoreA = a.rankingScore - rateA * 2 + (cibilScore >= a.minCibil ? 10 : 0);
      const scoreB = b.rankingScore - rateB * 2 + (cibilScore >= b.minCibil ? 10 : 0);
      return scoreB - scoreA;
    });
}

export function computeApprovalProbability(
  lender: LenderSnapshot,
  input: Pick<EligibilityInput, "monthlyIncome" | "cibilScore" | "loanAmount" | "employmentType">,
): number {
  const elig = checkEligibility({
    ...input,
    existingEmi: 0,
    tenureMonths: 60,
  });

  let prob = 40;
  if (input.cibilScore >= lender.minCibil) prob += 25;
  else if (input.cibilScore >= lender.minCibil - 50) prob += 10;

  if (input.monthlyIncome >= 100000) prob += 15;
  else if (input.monthlyIncome >= 50000) prob += 8;

  if (input.loanAmount <= lender.maxLoanAmount * 0.7) prob += 10;
  if (elig.eligible) prob += 12;
  if (input.employmentType === "salaried") prob += 5;

  return Math.min(98, Math.max(12, Math.round(prob)));
}

export function buildLoanOffers(
  lenders: LenderSnapshot[],
  loanAmount: number,
  tenureMonths: number,
  input: EligibilityInput,
): LoanOfferSnapshot[] {
  const ranked = rankLenders(lenders, loanAmount, tenureMonths, input.cibilScore);

  return ranked.slice(0, 10).map((lender, i) => {
    const effectiveRate = (lender.interestRateMin + lender.interestRateMax) / 2;
    const emi = calculateEmi(loanAmount, effectiveRate, tenureMonths);
    return {
      ...lender,
      effectiveRate,
      emi,
      totalInterest: totalInterestPayable(emi, tenureMonths, loanAmount),
      approvalProbability: computeApprovalProbability(lender, input),
      rank: i + 1,
    };
  });
}
