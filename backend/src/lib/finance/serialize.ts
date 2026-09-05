import type { Bank, FinanceApplication, FinanceCommission, FinanceLead, FinanceStatusHistory } from "@prisma/client";

function n(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function serializeBank(row: Bank) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo_url: row.logoUrl,
    bank_type: row.bankType,
    interest_rate_min: n(row.interestRateMin),
    interest_rate_max: n(row.interestRateMax),
    max_tenure_months: row.maxTenureMonths,
    processing_fee: row.processingFee,
    max_loan_amount: n(row.maxLoanAmount),
    features: row.features,
    is_active: row.isActive,
    is_featured: row.isFeatured,
    ranking_score: row.rankingScore,
    min_cibil: row.minCibil,
    short_code: row.shortCode,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function serializeApplication(row: FinanceApplication & { bank?: { name: string } | null }) {
  return {
    id: row.id,
    user_id: row.userId,
    bank_id: row.bankId,
    bank_name: row.bank?.name,
    vehicle_id: row.vehicleId,
    dsa_agent_id: row.dsaAgentId,
    amount: n(row.amount),
    tenure: row.tenure,
    loan_amount: n(row.loanAmount),
    tenure_months: row.tenureMonths,
    interest_rate: n(row.interestRate),
    emi_amount: n(row.emiAmount),
    status: row.status,
    ai_eligibility_score: row.aiEligibilityScore,
    approval_probability: row.approvalProbability,
    cibil_score: row.cibilScore,
    monthly_income: n(row.monthlyIncome),
    employment_type: row.employmentType,
    application_type: row.applicationType,
    applicant_metadata: row.applicantMetadata,
    documents: row.documents,
    notes: row.notes,
    soft_approval_status: row.softApprovalStatus,
    soft_approved_at: row.softApprovedAt?.toISOString() ?? null,
    comparison_session_id: row.comparisonSessionId,
    metadata: row.metadata,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function serializeLead(row: FinanceLead) {
  return {
    id: row.id,
    user_id: row.userId,
    dsa_id: row.dsaId,
    assigned_dsa_id: row.assignedDsaId ?? row.dsaId,
    assigned_bank_id: row.assignedBankId,
    application_id: row.applicationId,
    source: row.source,
    product_type: row.productType,
    loan_amount: n(row.loanAmount) ?? n(row.amount),
    monthly_income: n(row.monthlyIncome),
    cibil_score: row.cibilScore,
    city: row.city,
    phone: row.phone,
    email: row.email,
    customer_name: row.customerName,
    status: row.status,
    created_at: row.createdAt.toISOString(),
  };
}

export function serializeCommission(row: FinanceCommission) {
  return {
    id: row.id,
    user_id: row.userId,
    application_id: row.applicationId,
    dsa_agent_id: row.dsaAgentId,
    amount: n(row.amount),
    loan_amount: n(row.loanAmount),
    commission_rate: n(row.commissionRate),
    commission_amount: n(row.commissionAmount) ?? n(row.amount),
    status: row.status,
    paid_at: row.paidAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

export function serializeHistory(row: FinanceStatusHistory) {
  return {
    id: row.id,
    application_id: row.applicationId,
    status: row.status,
    from_status: row.fromStatus,
    to_status: row.toStatus ?? row.status,
    notes: row.note,
    changed_by: row.changedBy,
    created_at: row.createdAt.toISOString(),
  };
}
