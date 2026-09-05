import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api-response";
import { isFinanceSoftApprovalEnabled } from "@/lib/finance/flags";
import { financeActorFrom, handleFinanceError } from "@/lib/finance/http";
import { serializeApplication } from "@/lib/finance/serialize";
import { applySoftApproval } from "@/services/finance-marketplace.service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: Ctx) {
  if (!isFinanceSoftApprovalEnabled()) return err("Not found", 404);
  try {
    const actor = financeActorFrom(req);
    const { id } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;
    const decision = String(body.decision ?? body.soft_approval_status ?? "");
    const app = await applySoftApproval(actor, id, decision, body.note ? String(body.note) : undefined);
    return ok({ data: serializeApplication(app) });
  } catch (e) {
    return handleFinanceError(e);
  }
}
