import type { FinanceStatus } from "@/types/database";

export type LenderType = "bank" | "nbfc";
export type ApplicationType = "new_loan" | "refinance" | "top_up";

export interface Lender {
  id: string;
  name: string;
  slug: string;
  shortCode: string;
  logoUrl: string | null;
  lenderType: LenderType;
  interestRateMin: number;
  interestRateMax: number;
  maxTenureMonths: number;
  maxLoanAmount: number;
  processingFee: string | null;
  features: string[];
  isFeatured: boolean;
  rankingScore: number;
  minCibil: number;
}

export interface LoanOffer extends Lender {
  effectiveRate: number;
  emi: number;
  totalInterest: number;
  approvalProbability: number;
  rank: number;
  /** Product-specific published range used for pricing */
  productRateMin?: number;
  productRateMax?: number;
  rateEstimated?: boolean;
  /** Processing fee incl. 18% GST */
  processingFeeAmount?: number;
  /** EMI × tenure + processing fee */
  totalCost?: number;
}

export interface EligibilityInput {
  monthlyIncome: number;
  existingEmi: number;
  loanAmount: number;
  tenureMonths: number;
  cibilScore: number;
  employmentType: "salaried" | "self_employed" | "business";
  /** Finance hub category id or rate-card product (defaults to new car) */
  product?: string;
  /** On-road / valuation price — enables the LTV cap */
  vehiclePrice?: number;
}

export interface EligibilityResult {
  eligible: boolean;
  maxLoan: number;
  maxEmi: number;
  message: string;
  recommendedTenure: number;
  rateUsed?: number;
  maxLoanByIncome?: number;
  ltvCap?: number | null;
}

export interface CibilEstimate {
  score: number;
  band: "excellent" | "good" | "fair" | "poor";
  factors: { label: string; impact: "positive" | "negative" | "neutral" }[];
}

export interface AiRecommendation {
  lender: Lender;
  score: number;
  reasons: string[];
  approvalProbability: number;
  estimatedEmi: number;
}

export interface LoanApplication {
  id: string;
  userId: string;
  bankId: string | null;
  bankName?: string;
  vehicleId: string | null;
  dsaAgentId: string | null;
  loanAmount: number;
  tenureMonths: number;
  interestRate: number | null;
  emiAmount: number | null;
  status: FinanceStatus;
  aiEligibilityScore: number | null;
  approvalProbability: number | null;
  cibilScore: number | null;
  monthlyIncome: number | null;
  employmentType: string | null;
  applicationType: ApplicationType;
  documents: LoanDocument[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoanDocument {
  name: string;
  path: string;
  type: string;
  uploadedAt: string;
}

export interface FinanceAnalytics {
  totalApplications: number;
  submitted: number;
  processing: number;
  approved: number;
  rejected: number;
  disbursed: number;
  totalDisbursed: number;
  totalPipelineValue: number;
  avgApprovalProbability: number;
  conversionRate: number;
}

export interface FinanceLead {
  id: string;
  userId: string | null;
  source: string;
  productType: string;
  loanAmount: number | null;
  monthlyIncome: number | null;
  cibilScore: number | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  assignedDsaId: string | null;
  assignedBankId: string | null;
  applicationId: string | null;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  createdAt: string;
}

export interface FinanceCommission {
  id: string;
  applicationId: string;
  dsaAgentId: string;
  loanAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  paidAt: string | null;
  createdAt: string;
}

export interface FinanceVerification {
  id: string;
  applicationId: string;
  checkType: string;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  documentPath: string | null;
  createdAt: string;
}

export interface FinanceStatusHistoryEntry {
  id: string;
  applicationId: string;
  fromStatus: string | null;
  toStatus: string;
  notes: string | null;
  createdAt: string;
}

export interface BankIntegrationConfig {
  id: string;
  bankId: string;
  bankName?: string;
  provider: string;
  apiBaseUrl: string | null;
  webhookUrl: string | null;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  config: Record<string, unknown>;
}

export interface FinanceChartPoint {
  label: string;
  value: number;
  fill?: string;
}
