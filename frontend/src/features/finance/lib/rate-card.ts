/**
 * Indicative lender rate card (published rack rates, India, Sept 2026).
 * Mirrored in backend/src/lib/finance/rate-card.ts — keep both files identical.
 * Final rate is always decided by the lender at sanction.
 */

export const RATE_CARD_AS_OF = "Sept 2026";
export const GST_RATE = 0.18;

export type LoanProduct =
  | "new_car"
  | "used_car"
  | "two_wheeler"
  | "commercial"
  | "ev"
  | "loan_against_car"
  | "refinance";

export const LOAN_PRODUCTS: LoanProduct[] = [
  "new_car",
  "used_car",
  "two_wheeler",
  "commercial",
  "ev",
  "loan_against_car",
  "refinance",
];

export interface FeeRule {
  /** Percent of loan amount */
  pct: number;
  min: number;
  max: number;
}

export interface ProductRule {
  label: string;
  /** Max loan as fraction of vehicle on-road / valuation price */
  maxLtv: number;
  maxTenureMonths: number;
  minMonthlyIncome: number;
  /** Rate spread added to a lender's new-car range when the product rate is not published */
  spreadMin: number;
  spreadMax: number;
  defaultFee: FeeRule;
}

export const PRODUCT_RULES: Record<LoanProduct, ProductRule> = {
  new_car: { label: "New car loan", maxLtv: 0.9, maxTenureMonths: 84, minMonthlyIncome: 25000, spreadMin: 0, spreadMax: 0, defaultFee: { pct: 0.5, min: 1000, max: 10000 } },
  used_car: { label: "Used car loan", maxLtv: 0.8, maxTenureMonths: 72, minMonthlyIncome: 25000, spreadMin: 2.25, spreadMax: 3.5, defaultFee: { pct: 1, min: 3000, max: 15000 } },
  two_wheeler: { label: "Two-wheeler loan", maxLtv: 0.9, maxTenureMonths: 48, minMonthlyIncome: 12000, spreadMin: 3, spreadMax: 6, defaultFee: { pct: 2, min: 1000, max: 10000 } },
  commercial: { label: "Commercial vehicle loan", maxLtv: 0.9, maxTenureMonths: 72, minMonthlyIncome: 25000, spreadMin: 1.5, spreadMax: 4.5, defaultFee: { pct: 1.5, min: 5000, max: 25000 } },
  ev: { label: "EV loan", maxLtv: 0.9, maxTenureMonths: 84, minMonthlyIncome: 25000, spreadMin: -0.1, spreadMax: 0, defaultFee: { pct: 0.25, min: 500, max: 5000 } },
  loan_against_car: { label: "Loan against car", maxLtv: 0.7, maxTenureMonths: 60, minMonthlyIncome: 25000, spreadMin: 4, spreadMax: 6, defaultFee: { pct: 2, min: 5000, max: 25000 } },
  refinance: { label: "Car loan refinance", maxLtv: 0.8, maxTenureMonths: 60, minMonthlyIncome: 25000, spreadMin: 1.5, spreadMax: 3, defaultFee: { pct: 1, min: 3000, max: 15000 } },
};

export interface RateRange {
  min: number;
  max: number;
  /** "published" = lender website / RBI disclosure; omitted products are derived via spread */
  fee?: FeeRule;
}

export interface LenderRateCardEntry {
  slug: string;
  aliases: string[];
  name: string;
  shortCode: string;
  lenderType: "bank" | "nbfc";
  minCibil: number;
  maxLoanAmount: number;
  rankingScore: number;
  fee: FeeRule;
  feeLabel: string;
  features: string[];
  isFeatured: boolean;
  products: Partial<Record<LoanProduct, RateRange | null>>;
}

export const LENDER_RATE_CARD: LenderRateCardEntry[] = [
  {
    slug: "sbi", aliases: ["state-bank-of-india"], name: "State Bank of India", shortCode: "SBI", lenderType: "bank",
    minCibil: 650, maxLoanAmount: 10000000, rankingScore: 92, fee: { pct: 0.25, min: 500, max: 2000 }, feeLabel: "₹500 – ₹2,000",
    features: ["CIBIL-linked pricing", "No prepayment penalty on floating"], isFeatured: true,
    products: {
      new_car: { min: 8.9, max: 9.85 }, ev: { min: 8.8, max: 9.85 }, used_car: { min: 10.45, max: 15.6 },
      two_wheeler: { min: 11.7, max: 15.7, fee: { pct: 2, min: 1000, max: 10000 } }, commercial: { min: 8.5, max: 11.5 }, loan_against_car: null,
    },
  },
  {
    slug: "bob", aliases: ["bank-of-baroda"], name: "Bank of Baroda", shortCode: "BOB", lenderType: "bank",
    minCibil: 680, maxLoanAmount: 10000000, rankingScore: 88, fee: { pct: 0.25, min: 1000, max: 2000 }, feeLabel: "Up to ₹2,000",
    features: ["Floating rates from 7.60%", "Nil fee for women borrowers"], isFeatured: true,
    products: { new_car: { min: 7.6, max: 11.35 }, ev: { min: 7.6, max: 11.35 }, two_wheeler: { min: 12.4, max: 15.5, fee: { pct: 2, min: 1000, max: 10000 } } },
  },
  {
    slug: "canara", aliases: ["canara-bank"], name: "Canara Bank", shortCode: "CANARA", lenderType: "bank",
    minCibil: 680, maxLoanAmount: 10000000, rankingScore: 85, fee: { pct: 0.25, min: 1000, max: 5000 }, feeLabel: "0.25% (₹1,000 – ₹5,000)",
    features: ["Lowest PSU starting rate"], isFeatured: false,
    products: { new_car: { min: 7.45, max: 11.45 }, ev: { min: 7.45, max: 11.45 } },
  },
  {
    slug: "union", aliases: ["union-bank", "union-bank-of-india"], name: "Union Bank of India", shortCode: "UNION", lenderType: "bank",
    minCibil: 680, maxLoanAmount: 10000000, rankingScore: 82, fee: { pct: 0.25, min: 0, max: 1000 }, feeLabel: "Up to ₹1,000",
    features: ["Low processing fee"], isFeatured: false,
    products: { new_car: { min: 7.5, max: 10 }, ev: { min: 7.5, max: 10 }, two_wheeler: { min: 10.9, max: 13.9 } },
  },
  {
    slug: "pnb", aliases: ["punjab-national-bank"], name: "Punjab National Bank", shortCode: "PNB", lenderType: "bank",
    minCibil: 680, maxLoanAmount: 10000000, rankingScore: 84, fee: { pct: 0.25, min: 1000, max: 1500 }, feeLabel: "0.25% (₹1,000 – ₹1,500)",
    features: ["Floating from 7.60%", "Special rates for govt employees"], isFeatured: true,
    products: { new_car: { min: 7.6, max: 10.7 }, ev: { min: 7.6, max: 10.7 }, two_wheeler: { min: 10, max: 14 } },
  },
  {
    slug: "boi", aliases: ["bank-of-india"], name: "Bank of India", shortCode: "BOI", lenderType: "bank",
    minCibil: 670, maxLoanAmount: 5000000, rankingScore: 80, fee: { pct: 0.25, min: 2500, max: 10000 }, feeLabel: "0.25% (₹2,500 – ₹10,000)",
    features: ["No prepayment penalty", "50% fee waiver on EVs"], isFeatured: false,
    products: {
      new_car: { min: 7.6, max: 12.55 }, ev: { min: 7.6, max: 12.55, fee: { pct: 0.125, min: 1250, max: 5000 } },
      used_car: { min: 9.85, max: 13.55, fee: { pct: 1, min: 1000, max: 5000 } }, two_wheeler: { min: 7.6, max: 12.55, fee: { pct: 1, min: 1000, max: 5000 } },
    },
  },
  {
    slug: "iob", aliases: ["indian-overseas-bank"], name: "Indian Overseas Bank", shortCode: "IOB", lenderType: "bank",
    minCibil: 650, maxLoanAmount: 5000000, rankingScore: 74, fee: { pct: 0, min: 0, max: 0 }, feeLabel: "Nil",
    features: ["Nil processing fee"], isFeatured: false,
    products: { new_car: { min: 7.55, max: 12 }, ev: { min: 7.55, max: 12 } },
  },
  {
    slug: "uco", aliases: ["uco-bank"], name: "UCO Bank", shortCode: "UCO", lenderType: "bank",
    minCibil: 650, maxLoanAmount: 5000000, rankingScore: 72, fee: { pct: 0.5, min: 0, max: 5000 }, feeLabel: "0.5% (max ₹5,000)",
    features: ["Lowest published floor rate"], isFeatured: false,
    products: { new_car: { min: 7.35, max: 10 }, ev: { min: 7.35, max: 10 } },
  },
  {
    slug: "hdfc-bank", aliases: ["hdfc"], name: "HDFC Bank", shortCode: "HDFC", lenderType: "bank",
    minCibil: 700, maxLoanAmount: 25000000, rankingScore: 96, fee: { pct: 0.5, min: 3500, max: 5000 }, feeLabel: "Up to ₹5,000",
    features: ["Fast digital disbursal", "Deep OEM tie-ups"], isFeatured: true,
    products: {
      new_car: { min: 8.15, max: 12.5 }, ev: { min: 8.15, max: 12.5 }, used_car: { min: 9.5, max: 15 },
      two_wheeler: { min: 9.99, max: 24.64, fee: { pct: 2.5, min: 1000, max: 15000 } }, commercial: { min: 7.92, max: 16.07, fee: { pct: 1.5, min: 5000, max: 25000 } },
      loan_against_car: { min: 12.5, max: 18, fee: { pct: 2, min: 5000, max: 25000 } },
    },
  },
  {
    slug: "icici-bank", aliases: ["icici"], name: "ICICI Bank", shortCode: "ICICI", lenderType: "bank",
    minCibil: 700, maxLoanAmount: 15000000, rankingScore: 94, fee: { pct: 0.5, min: 3000, max: 5000 }, feeLabel: "Up to ₹5,000",
    features: ["Pre-approved offers", "Used car loans up to 100% value"], isFeatured: true,
    products: {
      new_car: { min: 8.35, max: 13 }, ev: { min: 8.35, max: 13 }, used_car: { min: 9.75, max: 16 },
      two_wheeler: { min: 10.25, max: 20, fee: { pct: 4, min: 1000, max: 15000 } }, loan_against_car: { min: 13, max: 18, fee: { pct: 2, min: 5000, max: 25000 } },
    },
  },
  {
    slug: "axis-bank", aliases: ["axis"], name: "Axis Bank", shortCode: "AXIS", lenderType: "bank",
    minCibil: 700, maxLoanAmount: 10000000, rankingScore: 90, fee: { pct: 1, min: 3500, max: 7000 }, feeLabel: "1% (₹3,500 – ₹7,000)",
    features: ["Maruti & OEM tie-up pricing"], isFeatured: true,
    products: {
      new_car: { min: 8.95, max: 13.5 }, ev: { min: 8.95, max: 13.5 }, used_car: { min: 12, max: 17 },
      two_wheeler: { min: 11, max: 20, fee: { pct: 1, min: 1000, max: 10000 } }, commercial: { min: 9.55, max: 16.9, fee: { pct: 1.5, min: 7500, max: 25000 } },
    },
  },
  {
    slug: "kotak", aliases: ["kotak-mahindra-bank"], name: "Kotak Mahindra Bank", shortCode: "KOTAK", lenderType: "bank",
    minCibil: 700, maxLoanAmount: 10000000, rankingScore: 88, fee: { pct: 0.5, min: 3500, max: 5000 }, feeLabel: "Nil – ₹5,000",
    features: ["Festive fee waivers", "Digital KYC"], isFeatured: true,
    products: { new_car: { min: 9, max: 13 }, ev: { min: 9, max: 13 }, used_car: { min: 11.5, max: 16.5 }, commercial: { min: 10, max: 18, fee: { pct: 2, min: 5000, max: 25000 } } },
  },
  {
    slug: "indusind", aliases: ["indusind-bank"], name: "IndusInd Bank", shortCode: "INDUS", lenderType: "bank",
    minCibil: 680, maxLoanAmount: 10000000, rankingScore: 82, fee: { pct: 1, min: 3000, max: 10000 }, feeLabel: "Up to 1%",
    features: ["Used & commercial specialist"], isFeatured: false,
    products: { new_car: { min: 8, max: 13 }, ev: { min: 8, max: 13 }, used_car: { min: 11, max: 16 }, commercial: { min: 9, max: 20, fee: { pct: 2, min: 5000, max: 25000 } } },
  },
  {
    slug: "idfc", aliases: ["idfc-first", "idfc-first-bank"], name: "IDFC FIRST Bank", shortCode: "IDFC", lenderType: "bank",
    minCibil: 680, maxLoanAmount: 7500000, rankingScore: 80, fee: { pct: 1, min: 3000, max: 15000 }, feeLabel: "Up to 1%",
    features: ["Flexible used-car & bike loans"], isFeatured: false,
    products: {
      new_car: { min: 9, max: 14 }, ev: { min: 9, max: 14 }, used_car: { min: 11.99, max: 18 },
      two_wheeler: { min: 8.5, max: 22, fee: { pct: 3, min: 1000, max: 15000 } }, commercial: { min: 10, max: 21, fee: { pct: 2, min: 5000, max: 25000 } },
    },
  },
  {
    slug: "au-bank", aliases: ["au"], name: "AU Small Finance Bank", shortCode: "AU", lenderType: "bank",
    minCibil: 650, maxLoanAmount: 5000000, rankingScore: 76, fee: { pct: 1.5, min: 3000, max: 15000 }, feeLabel: "Up to 1.5%",
    features: ["Self-employed friendly", "Tier-2/3 reach"], isFeatured: false,
    products: { new_car: { min: 9.5, max: 14 }, ev: { min: 9.5, max: 14 }, used_car: { min: 12, max: 18 }, commercial: { min: 11, max: 20 } },
  },
  {
    slug: "tata-capital", aliases: ["vastu"], name: "Tata Capital", shortCode: "TATA", lenderType: "nbfc",
    minCibil: 650, maxLoanAmount: 5000000, rankingScore: 86, fee: { pct: 2, min: 3000, max: 25000 }, feeLabel: "Up to 2%",
    features: ["Used & commercial vehicles", "Quick disbursal"], isFeatured: true,
    products: {
      new_car: { min: 8.75, max: 14 }, ev: { min: 8.75, max: 14 }, used_car: { min: 10.49, max: 18 },
      two_wheeler: { min: 12.5, max: 22 }, commercial: { min: 10.5, max: 18 }, loan_against_car: { min: 12, max: 18 },
    },
  },
  {
    slug: "cholamandalam", aliases: ["chola"], name: "Cholamandalam Finance", shortCode: "CHOLA", lenderType: "nbfc",
    minCibil: 620, maxLoanAmount: 5000000, rankingScore: 84, fee: { pct: 1.5, min: 3000, max: 25000 }, feeLabel: "Up to 1.5%",
    features: ["Older vehicles financed", "Tier-3 coverage"], isFeatured: true,
    products: { new_car: { min: 9.5, max: 15 }, ev: { min: 9.5, max: 15 }, used_car: { min: 12, max: 18 }, commercial: { min: 11, max: 20 }, loan_against_car: { min: 13, max: 20 } },
  },
  {
    slug: "mahindra-finance", aliases: ["mahindra"], name: "Mahindra Finance", shortCode: "M&M", lenderType: "nbfc",
    minCibil: 600, maxLoanAmount: 5000000, rankingScore: 82, fee: { pct: 1.5, min: 3000, max: 25000 }, feeLabel: "Up to 1.5%",
    features: ["Rural & semi-urban", "Tractor & CV loans"], isFeatured: true,
    products: { new_car: { min: 9.5, max: 16 }, ev: { min: 9.5, max: 16 }, used_car: { min: 12, max: 20 }, two_wheeler: { min: 12, max: 22 }, commercial: { min: 11, max: 20 }, loan_against_car: { min: 13, max: 20 } },
  },
  {
    slug: "bajaj", aliases: ["bajaj-finance", "bajaj-auto-finance"], name: "Bajaj Finance", shortCode: "BAJAJ", lenderType: "nbfc",
    minCibil: 650, maxLoanAmount: 2000000, rankingScore: 78, fee: { pct: 2, min: 1000, max: 15000 }, feeLabel: "Up to 2%",
    features: ["Instant two-wheeler approvals"], isFeatured: false,
    products: { new_car: null, ev: null, used_car: null, commercial: null, two_wheeler: { min: 12, max: 24 }, loan_against_car: { min: 13, max: 20 } },
  },
];

const BY_SLUG = new Map<string, LenderRateCardEntry>();
for (const entry of LENDER_RATE_CARD) {
  BY_SLUG.set(entry.slug, entry);
  for (const alias of entry.aliases) BY_SLUG.set(alias, entry);
}

export function findRateCardEntry(slug: string | null | undefined): LenderRateCardEntry | undefined {
  if (!slug) return undefined;
  return BY_SLUG.get(slug.toLowerCase());
}

/** Map finance hub category ids / loan-type strings to a rate-card product. */
export function toLoanProduct(value: string | null | undefined): LoanProduct {
  switch ((value ?? "").toLowerCase().replace(/-/g, "_")) {
    case "used_car":
    case "used_car_loan":
    case "pre_owned":
      return "used_car";
    case "bike":
    case "bike_loan":
    case "two_wheeler":
      return "two_wheeler";
    case "commercial":
    case "commercial_loan":
    case "cv":
      return "commercial";
    case "ev":
    case "ev_loan":
      return "ev";
    case "loan_against_car":
      return "loan_against_car";
    case "refinance":
      return "refinance";
    default:
      return "new_car";
  }
}

export interface LenderRateBase {
  slug: string;
  interestRateMin: number;
  interestRateMax: number;
}

export interface ResolvedProductRate {
  min: number;
  max: number;
  fee: FeeRule;
  /** true when the lender does not publish this product and the range is derived */
  estimated: boolean;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Product rate range for a lender. Returns null when the lender does not offer the product.
 * new_car uses the lender's own (DB/admin-editable) range.
 */
export function resolveProductRate(lender: LenderRateBase, product: LoanProduct): ResolvedProductRate | null {
  const card = findRateCardEntry(lender.slug);
  const rule = PRODUCT_RULES[product];
  const baseFee = card?.fee ?? PRODUCT_RULES.new_car.defaultFee;

  if (product === "new_car") {
    if (card && card.products.new_car === null) return null;
    return { min: lender.interestRateMin, max: lender.interestRateMax, fee: card?.products.new_car?.fee ?? baseFee, estimated: false };
  }

  const published = card?.products[product];
  if (published === null) return null;
  if (published) {
    return { min: published.min, max: published.max, fee: published.fee ?? (product === "ev" ? baseFee : rule.defaultFee), estimated: false };
  }

  const refBase = product === "refinance" && card?.products.used_car ? card.products.used_car : null;
  if (refBase) {
    return { min: round2(refBase.min - 0.5), max: round2(refBase.max - 0.5), fee: rule.defaultFee, estimated: true };
  }
  // Catalogue lenders only appear for products they publish; spreads apply to admin-added lenders.
  if (card || lender.interestRateMin <= 0) return null;
  return {
    min: round2(lender.interestRateMin + rule.spreadMin),
    max: round2(lender.interestRateMax + rule.spreadMax),
    fee: product === "ev" ? baseFee : rule.defaultFee,
    estimated: true,
  };
}

/**
 * Risk-based pricing inside the product range: strong CIBIL earns the floor rate,
 * weaker scores move towards the ceiling. Tenures above 60 months carry a small premium.
 */
export function priceForProfile(range: { min: number; max: number }, cibilScore: number, tenureMonths: number): number {
  let position: number;
  if (cibilScore >= 800) position = 0;
  else if (cibilScore >= 775) position = 0.08;
  else if (cibilScore >= 750) position = 0.18;
  else if (cibilScore >= 725) position = 0.3;
  else if (cibilScore >= 700) position = 0.45;
  else if (cibilScore >= 675) position = 0.62;
  else if (cibilScore >= 650) position = 0.8;
  else position = 1;
  const tenurePremium = tenureMonths > 60 ? 0.1 : 0;
  const rate = range.min + (range.max - range.min) * position + tenurePremium;
  return round2(Math.min(range.max, Math.max(range.min, rate)));
}

/** Processing fee including 18% GST */
export function processingFeeWithGst(fee: FeeRule, loanAmount: number): number {
  if (fee.pct <= 0 && fee.max <= 0) return 0;
  const base = Math.min(fee.max, Math.max(fee.min, (loanAmount * fee.pct) / 100));
  return Math.round(base * (1 + GST_RATE));
}

/** Present value of an EMI stream — the largest loan an EMI can service at a rate & tenure. */
export function loanFromEmi(emi: number, annualRate: number, tenureMonths: number): number {
  if (emi <= 0 || tenureMonths <= 0) return 0;
  const r = annualRate / 12 / 100;
  if (r === 0) return Math.round(emi * tenureMonths);
  return Math.round((emi * (1 - Math.pow(1 + r, -tenureMonths))) / r);
}

/** Lowest published floor across the rate card for a product. */
export function lowestPublishedRate(product: LoanProduct): number | null {
  let lowest: number | null = null;
  for (const entry of LENDER_RATE_CARD) {
    const r = resolveProductRate(
      { slug: entry.slug, interestRateMin: entry.products.new_car?.min ?? 0, interestRateMax: entry.products.new_car?.max ?? 0 },
      product
    );
    if (!r || r.estimated || r.min <= 0) continue;
    if (lowest == null || r.min < lowest) lowest = r.min;
  }
  return lowest;
}

/** Typical (median-ish) rate used for eligibility when no lender is selected. */
export function typicalRate(product: LoanProduct, cibilScore: number, tenureMonths: number): number {
  const rates: number[] = [];
  for (const entry of LENDER_RATE_CARD) {
    const r = resolveProductRate(
      { slug: entry.slug, interestRateMin: entry.products.new_car?.min ?? 0, interestRateMax: entry.products.new_car?.max ?? 0 },
      product
    );
    if (!r || r.min <= 0) continue;
    rates.push(priceForProfile(r, cibilScore, tenureMonths));
  }
  if (!rates.length) return 10;
  rates.sort((a, b) => a - b);
  return rates[Math.floor(rates.length / 2)];
}
