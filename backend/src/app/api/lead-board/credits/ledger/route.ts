import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSalesOsError, salesActorFrom } from "@/lib/sales-os/http";
import { getCredits } from "@/services/sales-board.service";

export async function GET(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    const data = await getCredits(actor);
    return ok({ data: data.ledger });
  } catch (e) {
    return handleSalesOsError(e);
  }
}
