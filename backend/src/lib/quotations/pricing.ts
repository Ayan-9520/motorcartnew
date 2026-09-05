/** Deterministic quotation pricing. Not AI. Finance amount is informational and not a sanction. */

export type PricingComponents = {
  exShowroomAmount: number;
  rtoAmount: number;
  insuranceAmount: number;
  accessoriesAmount: number;
  financeAmount: number;
  exchangeAmount: number;
  otherCharges: number;
  discountAmount: number;
  taxAmount: number;
};

export type CalculatedPricing = PricingComponents & { totalAmount: number };

export const PRICING_FORMULA =
  "total = exShowroom + rto + insurance + accessories + otherCharges + tax - discount - exchange";

const MAX_MONEY = 99_999_999.99;

export function money(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  const rounded = Math.round(n * 100) / 100;
  return rounded > MAX_MONEY ? MAX_MONEY : rounded;
}

export function calculateQuotationTotals(input: Partial<PricingComponents>): CalculatedPricing {
  const exShowroomAmount = money(input.exShowroomAmount);
  const rtoAmount = money(input.rtoAmount);
  const insuranceAmount = money(input.insuranceAmount);
  const accessoriesAmount = money(input.accessoriesAmount);
  const financeAmount = money(input.financeAmount);
  const exchangeAmount = money(input.exchangeAmount);
  const otherCharges = money(input.otherCharges);
  const discountAmount = money(input.discountAmount);
  const taxAmount = money(input.taxAmount);
  const payable =
    exShowroomAmount +
    rtoAmount +
    insuranceAmount +
    accessoriesAmount +
    otherCharges +
    taxAmount -
    discountAmount -
    exchangeAmount;
  return {
    exShowroomAmount,
    rtoAmount,
    insuranceAmount,
    accessoriesAmount,
    financeAmount,
    exchangeAmount,
    otherCharges,
    discountAmount,
    taxAmount,
    totalAmount: money(Math.max(0, payable)),
  };
}

export function generateQuotationNumber(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MCQ-${y}${m}${d}-${rand}`;
}

export const DEFAULT_VALIDITY_DAYS = 14;

export function defaultValidityWindow(from = new Date()) {
  const start = new Date(from);
  const end = new Date(from);
  end.setUTCDate(end.getUTCDate() + DEFAULT_VALIDITY_DAYS);
  return { validityStart: start, validityEnd: end };
}

export function isExpired(status: string, validityEnd: Date | null, now = new Date()): boolean {
  if (status === "expired") return true;
  if (status !== "issued") return false;
  if (!validityEnd) return false;
  return validityEnd.getTime() < now.getTime();
}
