import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { financeMarketplaceOff, handleFinanceError } from "@/lib/finance/http";
import { serializeBank } from "@/lib/finance/serialize";
import { listActiveLenders } from "@/services/finance-marketplace.service";

export async function GET(_req: NextRequest) {
  const off = financeMarketplaceOff();
  if (off) return off;
  try {
    const rows = await listActiveLenders();
    return ok({ data: rows.map(serializeBank) });
  } catch (e) {
    return handleFinanceError(e);
  }
}
