import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSalesOsError, salesActorFrom } from "@/lib/sales-os/http";
import { acquireBoardLead } from "@/services/sales-board.service";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = salesActorFrom(req);
    const { id } = await ctx.params;
    const data = await acquireBoardLead(actor, id);
    return ok({ data });
  } catch (e) {
    return handleSalesOsError(e);
  }
}
