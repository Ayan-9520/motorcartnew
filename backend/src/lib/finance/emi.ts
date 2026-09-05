export function calculateEmi(principal: number, annualRate: number, tenureMonths: number): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  const r = annualRate / 12 / 100;
  if (r === 0) return Math.round(principal / tenureMonths);
  const emi =
    (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  return Math.round(emi);
}

export function totalInterestPayable(emi: number, tenureMonths: number, principal: number): number {
  return Math.max(0, emi * tenureMonths - principal);
}

export function validateEmiParams(principal: number, annualRate: number, tenureMonths: number): string | null {
  if (!Number.isFinite(principal) || principal <= 0) return "principal must be a positive number";
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 40) {
    return "rate must be between 0 and 40";
  }
  if (!Number.isInteger(tenureMonths) || tenureMonths < 1 || tenureMonths > 120) {
    return "tenure must be an integer between 1 and 120";
  }
  return null;
}
