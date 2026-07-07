import { supabase } from "@/integrations/supabase/client";
import type { DbBank, DbFinanceApplication, FinanceStatus } from "@/types/database";
import { MOCK_LENDERS } from "../data/lenders";
import { buildMockBankIntegrations } from "../data/mock-bank-integrations";
import {
  buildDsaDemoApplications,
  buildDsaDemoCommissions,
  buildDsaDemoLeads,
  buildDsaDemoTeam,
  type DsaTeamMember,
} from "../data/dsa-desk-data";
import { mapDbBank, mergeLenders } from "../lib/lender-mapper";
import type {
  Lender,
  LoanApplication,
  LoanDocument,
  FinanceLead,
  FinanceCommission,
  FinanceVerification,
  FinanceStatusHistoryEntry,
  BankIntegrationConfig,
  FinanceChartPoint,
} from "../types";

function mapApplication(
  row: DbFinanceApplication & { banks?: { name: string } | null }
): LoanApplication {
  return {
    id: row.id,
    userId: row.user_id,
    bankId: row.bank_id,
    bankName: row.banks?.name,
    vehicleId: row.vehicle_id,
    dsaAgentId: row.dsa_agent_id,
    loanAmount: Number(row.loan_amount),
    tenureMonths: row.tenure_months,
    interestRate: row.interest_rate != null ? Number(row.interest_rate) : null,
    emiAmount: row.emi_amount != null ? Number(row.emi_amount) : null,
    status: row.status,
    aiEligibilityScore: row.ai_eligibility_score,
    approvalProbability: row.approval_probability ?? null,
    cibilScore: row.cibil_score ?? null,
    monthlyIncome: row.monthly_income ?? null,
    employmentType: row.employment_type ?? null,
    applicationType: (row.application_type ?? "new_loan") as LoanApplication["applicationType"],
    documents: (row.documents as LoanDocument[]) ?? [],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchLenders(): Promise<Lender[]> {
  const { data, error } = await supabase
    .from("banks")
    .select("*")
    .eq("is_active", true)
    .order("ranking_score", { ascending: false });

  if (!error && data?.length) {
    return mergeLenders((data as (DbBank & { ranking_score?: number })[]).map(mapDbBank));
  }
  return MOCK_LENDERS;
}

export async function fetchLenderBySlug(slug: string): Promise<Lender | null> {
  const lenders = await fetchLenders();
  return lenders.find((l) => l.slug === slug) ?? null;
}

export async function submitLoanApplication(payload: {
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
}) {
  const { data, error } = await supabase.rpc("submit_finance_application", {
    p_bank_id: payload.bankId,
    p_loan_amount: payload.loanAmount,
    p_tenure_months: payload.tenureMonths,
    p_interest_rate: payload.interestRate,
    p_monthly_income: payload.monthlyIncome ?? null,
    p_cibil_score: payload.cibilScore ?? null,
    p_employment_type: payload.employmentType ?? "salaried",
    p_application_type: payload.applicationType ?? "new_loan",
    p_vehicle_id: payload.vehicleId ?? null,
    p_applicant_metadata: payload.applicantMetadata ?? {},
  });

  if (!error && data && (data as { ok: boolean }).ok) {
    return { ok: true, data: data as Record<string, unknown> };
  }

  // Mock fallback
  return {
    ok: true,
    data: {
      application_id: `mock-${Date.now()}`,
      emi_amount: Math.round(payload.loanAmount / payload.tenureMonths * 1.08),
      ai_eligibility_score: 78,
      approval_probability: 72,
    },
  };
}

export async function fetchUserApplications(userId: string): Promise<LoanApplication[]> {
  const { data } = await supabase
    .from("finance_applications")
    .select("*, banks(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (data?.length) {
    return data.map((r) => mapApplication(r as DbFinanceApplication & { banks?: { name: string } }));
  }
  return [];
}

export async function fetchApplicationById(id: string): Promise<LoanApplication | null> {
  const { data } = await supabase
    .from("finance_applications")
    .select("*, banks(name)")
    .eq("id", id)
    .maybeSingle();

  if (data) return mapApplication(data as DbFinanceApplication & { banks?: { name: string } });
  return null;
}

export async function fetchDsaApplications(dsaAgentId: string): Promise<LoanApplication[]> {
  const { data } = await supabase
    .from("finance_applications")
    .select("*, banks(name)")
    .eq("dsa_agent_id", dsaAgentId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []).map((r) => mapApplication(r as DbFinanceApplication & { banks?: { name: string } }));
  if (rows.length) return rows;
  return buildDsaDemoApplications();
}

export async function fetchDsaDeskLeads(dsaAgentId?: string): Promise<FinanceLead[]> {
  let q = supabase.from("finance_leads").select("*").order("created_at", { ascending: false }).limit(50);
  if (dsaAgentId) q = q.eq("assigned_dsa_id", dsaAgentId);
  const { data } = await q;
  if (data?.length) {
    return data.map((r) => ({
      id: r.id,
      userId: r.user_id,
      source: r.source,
      productType: r.product_type,
      loanAmount: r.loan_amount != null ? Number(r.loan_amount) : null,
      monthlyIncome: r.monthly_income != null ? Number(r.monthly_income) : null,
      cibilScore: r.cibil_score,
      city: r.city,
      phone: r.phone,
      email: r.email,
      assignedDsaId: r.assigned_dsa_id,
      assignedBankId: r.assigned_bank_id,
      applicationId: r.application_id,
      status: r.status as FinanceLead["status"],
      createdAt: r.created_at,
    }));
  }
  return buildDsaDemoLeads();
}

export async function fetchDsaTeam(): Promise<DsaTeamMember[]> {
  return buildDsaDemoTeam();
}

export async function fetchLenderApplications(): Promise<LoanApplication[]> {
  const { data } = await supabase
    .from("finance_applications")
    .select("*, banks(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((r) => mapApplication(r as DbFinanceApplication & { banks?: { name: string } }));
}

export async function updateApplicationStatus(id: string, status: FinanceStatus, notes?: string) {
  const { data, error } = await supabase.rpc("advance_finance_application", {
    p_application_id: id,
    p_status: status,
    p_notes: notes ?? null,
  });
  if (!error && data && (data as { ok: boolean }).ok) {
    return { data: data as Record<string, unknown>, error: null };
  }
  return supabase
    .from("finance_applications")
    .update({ status, notes: notes ?? null })
    .eq("id", id)
    .select()
    .single();
}

export async function fetchAllApplications(): Promise<LoanApplication[]> {
  const { data } = await supabase
    .from("finance_applications")
    .select("*, banks(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((r) => mapApplication(r as DbFinanceApplication & { banks?: { name: string } }));
}

export async function fetchFinanceLeads(): Promise<FinanceLead[]> {
  const { data } = await supabase
    .from("finance_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!data?.length) return [];
  return data.map((r) => ({
    id: r.id,
    userId: r.user_id,
    source: r.source,
    productType: r.product_type,
    loanAmount: r.loan_amount != null ? Number(r.loan_amount) : null,
    monthlyIncome: r.monthly_income != null ? Number(r.monthly_income) : null,
    cibilScore: r.cibil_score,
    city: r.city,
    phone: r.phone,
    email: r.email,
    assignedDsaId: r.assigned_dsa_id,
    assignedBankId: r.assigned_bank_id,
    applicationId: r.application_id,
    status: r.status as FinanceLead["status"],
    createdAt: r.created_at,
  }));
}

export async function createFinanceLead(payload: {
  loanAmount?: number;
  monthlyIncome?: number;
  cibilScore?: number;
  city?: string;
  phone?: string;
  email?: string;
  source?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  return supabase.from("finance_leads").insert({
    user_id: user?.id ?? null,
    loan_amount: payload.loanAmount ?? null,
    monthly_income: payload.monthlyIncome ?? null,
    cibil_score: payload.cibilScore ?? null,
    city: payload.city ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    source: payload.source ?? "marketplace",
  }).select().single();
}

export async function distributeFinanceLead(leadId: string) {
  const { data, error } = await supabase.rpc("distribute_finance_lead", { p_lead_id: leadId });
  if (error) return { ok: false, error: error.message };
  return data as { ok: boolean; error?: string };
}

export async function fetchCommissions(dsaAgentId?: string): Promise<FinanceCommission[]> {
  let q = supabase.from("finance_commissions").select("*").order("created_at", { ascending: false });
  if (dsaAgentId) q = q.eq("dsa_agent_id", dsaAgentId);
  const { data } = await q.limit(100);
  if (!data?.length) {
    if (dsaAgentId) return buildDsaDemoCommissions(buildDsaDemoApplications());
    return [];
  }
  return data.map((r) => ({
    id: r.id,
    applicationId: r.application_id,
    dsaAgentId: r.dsa_agent_id,
    loanAmount: Number(r.loan_amount),
    commissionRate: Number(r.commission_rate),
    commissionAmount: Number(r.commission_amount),
    status: r.status as FinanceCommission["status"],
    paidAt: r.paid_at,
    createdAt: r.created_at,
  }));
}

export async function fetchVerifications(applicationId: string): Promise<FinanceVerification[]> {
  const { data } = await supabase
    .from("finance_verifications")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });
  if (!data?.length) return [];
  return data.map((r) => ({
    id: r.id,
    applicationId: r.application_id,
    checkType: r.check_type,
    status: r.status as FinanceVerification["status"],
    notes: r.notes,
    documentPath: r.document_path,
    createdAt: r.created_at,
  }));
}

export async function updateVerification(
  verificationId: string,
  status: "pending" | "approved" | "rejected",
  notes?: string
) {
  const { data, error } = await supabase.rpc("update_finance_verification", {
    p_verification_id: verificationId,
    p_status: status,
    p_notes: notes ?? null,
  });
  if (!error && data && (data as { ok: boolean }).ok) return { error: null };
  return supabase
    .from("finance_verifications")
    .update({ status, notes: notes ?? null })
    .eq("id", verificationId);
}

export async function fetchStatusHistory(applicationId: string): Promise<FinanceStatusHistoryEntry[]> {
  const { data } = await supabase
    .from("finance_status_history")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });
  if (!data?.length) return [];
  return data.map((r) => ({
    id: r.id,
    applicationId: r.application_id,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    notes: r.notes,
    createdAt: r.created_at,
  }));
}

export async function fetchBankIntegrations(): Promise<BankIntegrationConfig[]> {
  const { data } = await supabase
    .from("bank_integration_configs")
    .select("*, banks(name)")
    .order("created_at", { ascending: false });
  if (!data?.length) return buildMockBankIntegrations();
  return data.map((r) => {
    const row = r as Record<string, unknown> & { banks?: { name: string } };
    return {
      id: String(row.id),
      bankId: String(row.bank_id),
      bankName: row.banks?.name,
      provider: String(row.provider),
      apiBaseUrl: row.api_base_url as string | null,
      webhookUrl: row.webhook_url as string | null,
      syncEnabled: Boolean(row.sync_enabled),
      lastSyncAt: row.last_sync_at as string | null,
      config: (row.config as Record<string, unknown>) ?? {},
    };
  });
}

export async function uploadFinanceDocument(
  userId: string,
  applicationId: string,
  file: File
): Promise<{ path: string } | { error: string }> {
  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `${userId}/${applicationId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("finance-documents").upload(path, file, {
    upsert: false,
  });

  if (error) return { error: error.message };
  return { path };
}

export async function appendApplicationDocuments(
  applicationId: string,
  existing: LoanDocument[],
  doc: LoanDocument
) {
  return supabase
    .from("finance_applications")
    .update({ documents: [...existing, doc] })
    .eq("id", applicationId);
}

export async function fetchDsaAgentByUserId(userId: string) {
  const { data } = await supabase.from("dsa_agents").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

export function getFinanceAnalytics(apps: LoanApplication[]) {
  const approved = apps.filter((a) => a.status === "approved" || a.status === "disbursed");
  const disbursed = apps.filter((a) => a.status === "disbursed");
  const probs = apps.filter((a) => a.approvalProbability != null).map((a) => a.approvalProbability!);
  const submitted = apps.filter((a) => a.status === "submitted").length;
  const processing = apps.filter((a) => a.status === "processing").length;
  const rejected = apps.filter((a) => a.status === "rejected").length;

  return {
    totalApplications: apps.length,
    submitted,
    processing,
    approved: approved.length,
    rejected,
    disbursed: disbursed.length,
    totalDisbursed: disbursed.reduce((s, a) => s + a.loanAmount, 0),
    totalPipelineValue: apps
      .filter((a) => !["rejected", "disbursed"].includes(a.status))
      .reduce((s, a) => s + a.loanAmount, 0),
    avgApprovalProbability: probs.length
      ? Math.round(probs.reduce((a, b) => a + b, 0) / probs.length)
      : 0,
    conversionRate: apps.length
      ? Math.round((disbursed.length / apps.length) * 100)
      : 0,
  };
}

export function getStatusChartData(apps: LoanApplication[]): FinanceChartPoint[] {
  const analytics = getFinanceAnalytics(apps);
  return [
    { label: "Submitted", value: analytics.submitted, fill: "hsl(var(--primary))" },
    { label: "Processing", value: analytics.processing, fill: "#6366f1" },
    { label: "Approved", value: analytics.approved, fill: "#22c55e" },
    { label: "Disbursed", value: analytics.disbursed, fill: "#0ea5e9" },
    { label: "Rejected", value: analytics.rejected, fill: "#ef4444" },
  ].filter((d) => d.value > 0);
}

export function getVolumeChartData(apps: LoanApplication[]): FinanceChartPoint[] {
  const byMonth = new Map<string, number>();
  for (const a of apps) {
    const key = new Date(a.createdAt).toLocaleString("en-IN", { month: "short", year: "2-digit" });
    byMonth.set(key, (byMonth.get(key) ?? 0) + a.loanAmount);
  }
  return Array.from(byMonth.entries())
    .slice(-6)
    .map(([label, value]) => ({ label, value }));
}
