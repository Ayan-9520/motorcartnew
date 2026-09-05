import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { allowSlidingWindow } from "@/lib/http/sliding-window";
import { handleQuotationError, quotationActorFrom, requestIp } from "@/lib/quotations/http";
import { QuotationError } from "@/lib/quotations/errors";
import { issueQuotation } from "@/services/quotation.service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const actor = quotationActorFrom(req);
    const ip = requestIp(req);
    if (!allowSlidingWindow(`quotations:issue:${actor.userId}:${ip}`, 20, 15 * 60 * 1000)) {
      throw new QuotationError("Too many issue requests. Please try again later.", 429, "RATE_LIMITED");
    }
    const { id } = await ctx.params;
    const data = await issueQuotation(actor, id);
    return ok({ data });
  } catch (e) {
    return handleQuotationError(e);
  }
}
