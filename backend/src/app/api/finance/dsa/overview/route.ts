import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { financeActorFrom, financeMarketplaceOff, handleFinanceError } from "@/lib/finance/http";
import { dsaOverview } from "@/services/finance-dsa.service";

export async function GET(req: NextRequest) {
  const off = financeMarketplaceOff();
  if (off) return off;
  try {
    const actor = financeActorFrom(req);
    const data = await dsaOverview(actor);
    return ok({ data });
  } catch (e) {
    return handleFinanceError(e);
  }
}
