import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { financeActorFrom, financeMarketplaceOff, handleFinanceError } from "@/lib/finance/http";
import { serializeApplication } from "@/lib/finance/serialize";
import { patchLenderApplication } from "@/services/finance-lender.service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: Ctx) {
  const off = financeMarketplaceOff();
  if (off) return off;
  try {
    const actor = financeActorFrom(req);
    const { id } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;
    const app = await patchLenderApplication(actor, id, {
      notes: body.notes != null ? String(body.notes) : undefined,
      interestRate: body.interestRate != null ? Number(body.interestRate) : body.interest_rate != null ? Number(body.interest_rate) : undefined,
      emiAmount: body.emiAmount != null ? Number(body.emiAmount) : body.emi_amount != null ? Number(body.emi_amount) : undefined,
      decision: body.decision ? String(body.decision) : undefined,
      note: body.note ? String(body.note) : undefined,
    });
    return ok({ data: serializeApplication(app) });
  } catch (e) {
    return handleFinanceError(e);
  }
}
