import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { financeActorFrom, financeMarketplaceOff, handleFinanceError } from "@/lib/finance/http";
import { serializeLead } from "@/lib/finance/serialize";
import { dsaLeads } from "@/services/finance-dsa.service";

export async function GET(req: NextRequest) {
  const off = financeMarketplaceOff();
  if (off) return off;
  try {
    const actor = financeActorFrom(req);
    const rows = await dsaLeads(actor);
    return ok({ data: rows.map(serializeLead) });
  } catch (e) {
    return handleFinanceError(e);
  }
}
