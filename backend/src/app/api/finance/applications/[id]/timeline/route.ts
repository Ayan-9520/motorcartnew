import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { financeActorFrom, financeMarketplaceOff, handleFinanceError } from "@/lib/finance/http";
import { serializeHistory } from "@/lib/finance/serialize";
import { getTimeline } from "@/services/finance-marketplace.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Ctx) {
  const off = financeMarketplaceOff();
  if (off) return off;
  try {
    const actor = financeActorFrom(req);
    const { id } = await context.params;
    const rows = await getTimeline(actor, id);
    return ok({ data: rows.map(serializeHistory) });
  } catch (e) {
    return handleFinanceError(e);
  }
}
