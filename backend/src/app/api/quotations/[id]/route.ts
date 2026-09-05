import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { allowSlidingWindow } from "@/lib/http/sliding-window";
import { handleQuotationError, quotationActorFrom, requestIp } from "@/lib/quotations/http";
import { QuotationError } from "@/lib/quotations/errors";
import { getQuotation, updateQuotation } from "@/services/quotation.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const actor = quotationActorFrom(req);
    const { id } = await ctx.params;
    const data = await getQuotation(actor, id);
    return ok({ data });
  } catch (e) {
    return handleQuotationError(e);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const actor = quotationActorFrom(req);
    const ip = requestIp(req);
    if (!allowSlidingWindow(`quotations:patch:${actor.userId}:${ip}`, 40, 15 * 60 * 1000)) {
      throw new QuotationError("Too many updates. Please try again later.", 429, "RATE_LIMITED");
    }
    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const data = await updateQuotation(actor, id, body);
    return ok({ data });
  } catch (e) {
    return handleQuotationError(e);
  }
}
