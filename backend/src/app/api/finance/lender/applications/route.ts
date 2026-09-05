import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { financeActorFrom, financeMarketplaceOff, handleFinanceError } from "@/lib/finance/http";
import { serializeApplication } from "@/lib/finance/serialize";
import { lenderApplications } from "@/services/finance-lender.service";

export async function GET(req: NextRequest) {
  const off = financeMarketplaceOff();
  if (off) return off;
  try {
    const actor = financeActorFrom(req);
    const rows = await lenderApplications(actor);
    return ok({ data: rows.map(serializeApplication) });
  } catch (e) {
    return handleFinanceError(e);
  }
}
