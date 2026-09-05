import { api } from "@/lib/api/axios";
import { featureFlags } from "@/config/feature-flags";
import { mapDbBank } from "../lib/lender-mapper";
import type { DbBank, DbFinanceApplication, FinanceStatus } from "@/types/database";
import type {
  Lender,
  LoanApplication,
  LoanDocument,
  FinanceLead,
  FinanceCommission,
  FinanceStatusHistoryEntry,
} from "../types";

export function isFinanceRestEnabled(): boolean {
  return featureFlags.financeMarketplace;
}

function mapRestApplication(row: Record<string, unknown> & { banks?: { name: string } | null }): LoanApplication {
  const db = row as unknown as DbFinanceApplication & { banks?: { name: string } | null; bank_name?: string };
  return {
    id: String(row.id),
    userId: String(row.user_id),
    bankId: (row.bank_id as string | null) ?? null,
    bankName: db.banks?.name ?? (row.bank_name as string | undefined),
    vehicleId: (row.vehicle_id as string | null) ?? null,
    dsaAgentId: (row.dsa_agent_id as string | null) ?? null,
    loanAmount: Number(row.loan_amount ?? row.amount ?? 0),
    tenureMonths: Number(row.tenure_months ?? row.tenure ?? 0),
    interestRate: row.interest_rate != null ? Number(row.interest_rate) : null,
    emiAmount: row.emi_amount != null ? Number(row.emi_amount) : null,
    status: row.status as FinanceStatus,
    aiEligibilityScore: (row.ai_eligibility_score as number | null) ?? null,
    approvalProbability: (row.approval_probability as number | null) ?? null,
    cibilScore: (row.cibil_score as number | null) ?? null,
    monthlyIncome: row.monthly_income != null ? Number(row.monthly_income) : null,
    employmentType: (row.employment_type as string | null) ?? null,
    applicationType: ((row.application_type as string) ?? "new_loan") as LoanApplication["applicationType"],
    documents: (row.documents as LoanDocument[]) ?? [],
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function restFetchLenders(): Promise<Lender[]> {
  const { data } = await api.get<{ data: DbBank[] }>("/api/finance/lenders");
  return (data.data ?? []).map((b) => mapDbBank(b));
}

export async function restSubmitLoanApplication(payload: {
  bankId: string;
  loanAmount: number;
  tenureMonths: number;
  interestRate: number;
  monthlyIncome?: number;
  cibilScore?: number;
  employmentType?: string;
  applicationType?: string;
  vehicleId?: string;
  applicantMetadata?: Record<string, unknown>;
}): Promise<{ ok: true; data: Record<string, unknown> }> {
  const { data } = await api.post<{ ok: boolean; application_id: string; data: Record<string, unknown> }>(
    "/api/finance/applications",
    {
      bankId: payload.bankId,
      loanAmount: payload.loanAmount,
      tenureMonths: payload.tenureMonths,
      interestRate: payload.interestRate,
      monthlyIncome: payload.monthlyIncome,
      cibilScore: payload.cibilScore,
      employmentType: payload.employmentType,
      applicationType: payload.applicationType,
      vehicleId: payload.vehicleId,
      applicantMetadata: payload.applicantMetadata,
    },
  );
  return { ok: true, data: { application_id: data.application_id, ...(data.data ?? {}) } };
}

export async function restFetchApplications(): Promise<LoanApplication[]> {
  const { data } = await api.get<{ data: Record<string, unknown>[] }>("/api/finance/applications");
  return (data.data ?? []).map((r) => mapRestApplication(r));
}

export async function restFetchApplicationById(id: string): Promise<LoanApplication | null> {
  const { data } = await api.get<{ data: Record<string, unknown> }>(`/api/finance/applications/${id}`);
  return data.data ? mapRestApplication(data.data) : null;
}

export async function restFetchTimeline(id: string): Promise<FinanceStatusHistoryEntry[]> {
  const { data } = await api.get<{ data: Record<string, unknown>[] }>(`/api/finance/applications/${id}/timeline`);
  return (data.data ?? []).map((r) => ({
    id: String(r.id),
    applicationId: String(r.application_id),
    fromStatus: (r.from_status as string | null) ?? null,
    toStatus: String(r.to_status ?? r.status),
    notes: (r.notes as string | null) ?? null,
    createdAt: String(r.created_at),
  }));
}

export async function restUpdateStatus(id: string, status: FinanceStatus, notes?: string) {
  const { data } = await api.patch<{ data: Record<string, unknown> }>(`/api/finance/applications/${id}/status`, {
    status,
    note: notes,
  });
  return { data: data.data, error: null };
}

export async function restFetchDsaApplications(): Promise<LoanApplication[]> {
  const { data } = await api.get<{ data: Record<string, unknown>[] }>("/api/finance/dsa/applications");
  return (data.data ?? []).map((r) => mapRestApplication(r));
}

export async function restFetchDsaLeads(): Promise<FinanceLead[]> {
  const { data } = await api.get<{ data: Record<string, unknown>[] }>("/api/finance/dsa/leads");
  return (data.data ?? []).map((r) => ({
    id: String(r.id),
    userId: (r.user_id as string | null) ?? null,
    source: String(r.source ?? "marketplace"),
    productType: String(r.product_type ?? "vehicle_loan"),
    loanAmount: r.loan_amount != null ? Number(r.loan_amount) : null,
    monthlyIncome: r.monthly_income != null ? Number(r.monthly_income) : null,
    cibilScore: (r.cibil_score as number | null) ?? null,
    city: (r.city as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    assignedDsaId: (r.assigned_dsa_id as string | null) ?? null,
    assignedBankId: (r.assigned_bank_id as string | null) ?? null,
    applicationId: (r.application_id as string | null) ?? null,
    status: r.status as FinanceLead["status"],
    createdAt: String(r.created_at),
  }));
}

export async function restFetchDsaCommissions(): Promise<FinanceCommission[]> {
  const { data } = await api.get<{ data: Record<string, unknown>[] }>("/api/finance/dsa/commissions");
  return mapCommissions(data.data ?? []);
}

export async function restFetchLenderApplications(): Promise<LoanApplication[]> {
  const { data } = await api.get<{ data: Record<string, unknown>[] }>("/api/finance/lender/applications");
  return (data.data ?? []).map((r) => mapRestApplication(r));
}

export async function restFetchCommissions(): Promise<FinanceCommission[]> {
  const { data } = await api.get<{ data: Record<string, unknown>[] }>("/api/finance/commissions");
  return mapCommissions(data.data ?? []);
}

export async function restCompare(payload: {
  loanAmount: number;
  tenureMonths: number;
  monthlyIncome?: number;
  cibilScore?: number;
  employmentType?: string;
}) {
  if (!featureFlags.financeCompareApi) return null;
  const { data } = await api.post<{ data: { comparison_session_id: string; offers: unknown[] } }>(
    "/api/finance/compare",
    payload,
  );
  return data.data;
}

export async function restEligibility(payload: {
  monthlyIncome: number;
  existingEmi?: number;
  loanAmount: number;
  tenureMonths: number;
  cibilScore: number;
  employmentType?: string;
}) {
  if (!featureFlags.financeEligibilityApi) return null;
  const { data } = await api.post<{ data: Record<string, unknown> }>("/api/finance/eligibility", payload);
  return data.data;
}

export async function restUploadAndAttachDocument(
  applicationId: string,
  userId: string,
  file: File,
  docType = "other",
): Promise<{ path: string } | { error: string }> {
  if (!featureFlags.financeDocumentsApi) return { error: "documents api off" };
  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `${userId}/${applicationId}/${Date.now()}.${ext}`;
  const form = new FormData();
  form.append("file", file);
  form.append("bucket", "finance-documents");
  form.append("path", path);
  const uploaded = await api.post<{ path: string; publicUrl: string }>("/api/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  await api.post(`/api/finance/applications/${applicationId}/documents`, {
    docType,
    fileName: file.name,
    fileUrl: uploaded.data.publicUrl,
  });
  return { path: uploaded.data.path };
}

function mapCommissions(rows: Record<string, unknown>[]): FinanceCommission[] {
  return rows.map((r) => ({
    id: String(r.id),
    applicationId: String(r.application_id ?? ""),
    dsaAgentId: String(r.dsa_agent_id ?? ""),
    loanAmount: Number(r.loan_amount ?? 0),
    commissionRate: Number(r.commission_rate ?? 0),
    commissionAmount: Number(r.commission_amount ?? r.amount ?? 0),
    status: r.status as FinanceCommission["status"],
    paidAt: (r.paid_at as string | null) ?? null,
    createdAt: String(r.created_at),
  }));
}
