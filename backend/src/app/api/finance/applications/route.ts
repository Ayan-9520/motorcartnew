import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { financeActorFrom, financeMarketplaceOff, handleFinanceError } from "@/lib/finance/http";
import { serializeApplication } from "@/lib/finance/serialize";
import { listApplications, submitApplication } from "@/services/finance-marketplace.service";

export async function GET(req: NextRequest) {
  const off = financeMarketplaceOff();
  if (off) return off;
  try {
    const actor = financeActorFrom(req);
    const rows = await listApplications(actor);
    return ok({ data: rows.map(serializeApplication) });
  } catch (e) {
    return handleFinanceError(e);
  }
}

export async function POST(req: NextRequest) {
  const off = financeMarketplaceOff();
  if (off) return off;
  try {
    const actor = financeActorFrom(req);
    const body = (await req.json()) as Record<string, unknown>;
    const app = await submitApplication(actor, {
      bankId: body.bankId ? String(body.bankId) : body.bank_id ? String(body.bank_id) : null,
      loanAmount: Number(body.loanAmount ?? body.loan_amount ?? body.amount),
      tenureMonths: Number(body.tenureMonths ?? body.tenure_months ?? body.tenure ?? 60),
      interestRate: body.interestRate != null ? Number(body.interestRate) : body.interest_rate != null ? Number(body.interest_rate) : null,
      monthlyIncome: body.monthlyIncome != null ? Number(body.monthlyIncome) : body.monthly_income != null ? Number(body.monthly_income) : null,
      cibilScore: body.cibilScore != null ? Number(body.cibilScore) : body.cibil_score != null ? Number(body.cibil_score) : null,
      employmentType: body.employmentType ? String(body.employmentType) : body.employment_type ? String(body.employment_type) : null,
      applicationType: body.applicationType ? String(body.applicationType) : body.application_type ? String(body.application_type) : null,
      vehicleId: body.vehicleId ? String(body.vehicleId) : body.vehicle_id ? String(body.vehicle_id) : null,
      dsaAgentId: body.dsaAgentId ? String(body.dsaAgentId) : body.dsa_agent_id ? String(body.dsa_agent_id) : null,
      comparisonSessionId: body.comparisonSessionId ? String(body.comparisonSessionId) : body.comparison_session_id ? String(body.comparison_session_id) : null,
      applicantMetadata: (body.applicantMetadata ?? body.applicant_metadata ?? {}) as Record<string, unknown>,
      notes: body.notes != null ? String(body.notes) : null,
    });
    return ok({ ok: true, application_id: app.id, data: serializeApplication(app) }, 201);
  } catch (e) {
    return handleFinanceError(e);
  }
}
