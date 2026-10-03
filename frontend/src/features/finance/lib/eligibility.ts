import type { EligibilityInput, EligibilityResult } from "../types";
import { PRODUCT_RULES, loanFromEmi, toLoanProduct, typicalRate } from "./rate-card";

/** FOIR — share of net monthly income lenders allow towards all EMIs. */
function foirFor(employmentType: EligibilityInput["employmentType"] | string, monthlyIncome: number): number {
  const base = employmentType === "salaried" ? 0.5 : employmentType === "self_employed" ? 0.45 : 0.4;
  return monthlyIncome >= 100000 ? base + 0.05 : base;
}

function lakh(n: number): string {
  return `₹${(n / 100000).toFixed(1)}L`;
}

export function checkEligibility(input: EligibilityInput): EligibilityResult {
  const { monthlyIncome, existingEmi, loanAmount, tenureMonths, cibilScore, employmentType } = input;
  const product = toLoanProduct(input.product);
  const rule = PRODUCT_RULES[product];
  const tenure = Math.min(Math.max(1, tenureMonths), rule.maxTenureMonths);

  const maxEmi = Math.max(0, monthlyIncome * foirFor(employmentType, monthlyIncome) - existingEmi);
  const rateUsed = typicalRate(product, cibilScore, tenure);
  const maxLoanByIncome = loanFromEmi(maxEmi, rateUsed, tenure);
  const ltvCap = input.vehiclePrice && input.vehiclePrice > 0 ? Math.round(input.vehiclePrice * rule.maxLtv) : null;
  const maxLoan = ltvCap != null ? Math.min(maxLoanByIncome, ltvCap) : maxLoanByIncome;

  const cibilOk = cibilScore >= 650;
  const incomeOk = monthlyIncome >= rule.minMonthlyIncome;
  const emiOk = maxEmi >= (product === "two_wheeler" ? 1500 : 5000);
  const amountOk = loanAmount <= maxLoan;
  const tenureOk = tenureMonths <= rule.maxTenureMonths;

  const eligible = cibilOk && incomeOk && emiOk && amountOk;

  let message: string;
  if (!incomeOk) message = `Minimum monthly income ₹${rule.minMonthlyIncome.toLocaleString("en-IN")} required for ${rule.label.toLowerCase()}.`;
  else if (!cibilOk) message = "CIBIL score below 650 — try NBFC partners or improve credit.";
  else if (!emiOk) message = "Reduce existing EMIs or increase income.";
  else if (!amountOk && ltvCap != null && ltvCap <= maxLoanByIncome)
    message = `Lenders fund up to ${Math.round(rule.maxLtv * 100)}% of the vehicle price — max loan ${lakh(ltvCap)}. Increase down payment.`;
  else if (!amountOk) message = `Max eligible loan ~${lakh(maxLoan)} at ~${rateUsed}% for ${tenure} months.`;
  else message = `Eligible for up to ${lakh(maxLoan)} at ~${rateUsed}% p.a. ${cibilScore >= 750 ? "Best-rate band." : ""}`.trim();
  if (!tenureOk) message += ` Max tenure for ${rule.label.toLowerCase()} is ${rule.maxTenureMonths} months.`;

  const recommendedTenure = Math.min(
    rule.maxTenureMonths,
    loanAmount > 3000000 ? 84 : loanAmount > 1500000 ? 72 : loanAmount > 300000 ? 60 : 36
  );

  return {
    eligible,
    maxLoan,
    maxEmi: Math.round(maxEmi),
    message,
    recommendedTenure,
    rateUsed,
    maxLoanByIncome,
    ltvCap,
  };
}
