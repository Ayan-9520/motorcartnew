import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { actorFromJwt } from "@/lib/finance/access";
import { isFinanceEligibilityApiEnabled } from "@/lib/finance/flags";
import { handleFinanceError } from "@/lib/finance/http";
import { runEligibility } from "@/services/finance-marketplace.service";

export async function POST(req: NextRequest) {
  if (!isFinanceEligibilityApiEnabled()) return err("Not found", 404);
  try {
    const auth = getAuthUser(req);
    const body = (await req.json()) as Record<string, unknown>;
    const result = await runEligibility(auth ? actorFromJwt(auth) : null, {
      monthlyIncome: Number(body.monthlyIncome ?? body.monthly_income),
      existingEmi: Number(body.existingEmi ?? body.existing_emi ?? 0),
      loanAmount: Number(body.loanAmount ?? body.loan_amount),
      tenureMonths: Number(body.tenureMonths ?? body.tenure_months ?? 60),
      cibilScore: Number(body.cibilScore ?? body.cibil_score),
      employmentType: String(body.employmentType ?? body.employment_type ?? "salaried"),
    });
    return ok({ data: result });
  } catch (e) {
    return handleFinanceError(e);
  }
}
