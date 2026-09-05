import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { financeMarketplaceOff, handleFinanceError } from "@/lib/finance/http";
import { calculateEmiQuote } from "@/services/finance-marketplace.service";

export async function GET(req: NextRequest) {
  const off = financeMarketplaceOff();
  if (off) return off;
  try {
    const q = req.nextUrl.searchParams;
    const principal = Number(q.get("principal") ?? q.get("amount") ?? 0);
    const rate = Number(q.get("rate") ?? q.get("interest_rate") ?? 0);
    const tenure = Number(q.get("tenure") ?? q.get("tenure_months") ?? 0);
    const data = await calculateEmiQuote(principal, rate, Math.round(tenure));
    return ok({ data });
  } catch (e) {
    return handleFinanceError(e);
  }
}
