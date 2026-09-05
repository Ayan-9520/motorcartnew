import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api-response";
import { isFinanceCompareApiEnabled } from "@/lib/finance/flags";
import { financeActorFrom, handleFinanceError } from "@/lib/finance/http";
import { compareLenders } from "@/services/finance-marketplace.service";

export async function POST(req: NextRequest) {
  if (!isFinanceCompareApiEnabled()) return err("Not found", 404);
  try {
    const actor = financeActorFrom(req);
    const body = (await req.json()) as Record<string, unknown>;
    const data = await compareLenders(actor, {
      loanAmount: Number(body.loanAmount ?? body.loan_amount),
      tenureMonths: Number(body.tenureMonths ?? body.tenure_months ?? 60),
      monthlyIncome: body.monthlyIncome != null ? Number(body.monthlyIncome) : undefined,
      existingEmi: body.existingEmi != null ? Number(body.existingEmi) : undefined,
      cibilScore: body.cibilScore != null ? Number(body.cibilScore) : undefined,
      employmentType: body.employmentType ? String(body.employmentType) : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleFinanceError(e);
  }
}
