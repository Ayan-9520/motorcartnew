import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { financeActorFrom, financeMarketplaceOff, handleFinanceError } from "@/lib/finance/http";
import { isFinanceStaffRole, FinanceError } from "@/lib/finance/errors";
import { serializeCommission } from "@/lib/finance/serialize";
import { listCommissionsForManager } from "@/services/finance-commission.service";
import { dsaCommissions } from "@/services/finance-dsa.service";

export async function GET(req: NextRequest) {
  const off = financeMarketplaceOff();
  if (off) return off;
  try {
    const actor = financeActorFrom(req);
    if (actor.role === "dsa_agent") {
      const rows = await dsaCommissions(actor);
      return ok({ data: rows.map(serializeCommission) });
    }
    if (!isFinanceStaffRole(actor.role)) {
      throw new FinanceError("Forbidden", 403, "FORBIDDEN");
    }
    const rows = await listCommissionsForManager();
    return ok({ data: rows.map(serializeCommission) });
  } catch (e) {
    return handleFinanceError(e);
  }
}
