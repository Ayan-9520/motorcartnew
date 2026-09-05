export type EligibilityInput = {
  monthlyIncome: number;
  existingEmi: number;
  loanAmount: number;
  tenureMonths: number;
  cibilScore: number;
  employmentType: string;
};

export type EligibilityResult = {
  eligible: boolean;
  maxLoan: number;
  maxEmi: number;
  message: string;
  recommendedTenure: number;
};

/** Server copy of frontend/src/features/finance/lib/eligibility.ts — keep rules in sync. */
export function checkEligibility(input: EligibilityInput): EligibilityResult {
  const { monthlyIncome, existingEmi, loanAmount, tenureMonths, cibilScore, employmentType } = input;

  const incomeMultiplier =
    employmentType === "salaried" ? 0.5 : employmentType === "self_employed" ? 0.45 : 0.4;
  const maxEmi = Math.max(0, monthlyIncome * incomeMultiplier - existingEmi);
  const maxLoan = Math.round(maxEmi * tenureMonths * 0.92);

  const cibilOk = cibilScore >= 650;
  const incomeOk = monthlyIncome >= 25000;
  const emiOk = maxEmi >= 5000;
  const amountOk = loanAmount <= maxLoan * 1.05;

  const eligible = cibilOk && incomeOk && emiOk && amountOk;

  let message: string;
  if (!incomeOk) message = "Minimum monthly income ₹25,000 required.";
  else if (!cibilOk) message = "CIBIL score below 650 — try NBFC partners or improve credit.";
  else if (!emiOk) message = "Reduce existing EMIs or increase income.";
  else if (!amountOk) message = `Max eligible loan ~₹${(maxLoan / 100000).toFixed(1)}L for selected tenure.`;
  else message = `Eligible for up to ₹${(maxLoan / 100000).toFixed(1)}L. ${cibilScore >= 750 ? "Premium rates likely." : ""}`;

  const recommendedTenure = loanAmount > 3000000 ? 84 : loanAmount > 1500000 ? 72 : 60;

  return { eligible, maxLoan, maxEmi: Math.round(maxEmi), message, recommendedTenure };
}
