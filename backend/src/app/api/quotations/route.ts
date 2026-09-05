import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { allowSlidingWindow } from "@/lib/http/sliding-window";
import { handleQuotationError, quotationActorFrom, requestIp } from "@/lib/quotations/http";
import { QuotationError } from "@/lib/quotations/errors";
import { createQuotation, listQuotations } from "@/services/quotation.service";

export async function GET(req: NextRequest) {
  try {
    const actor = quotationActorFrom(req);
    const data = await listQuotations(actor);
    return ok({ data });
  } catch (e) {
    return handleQuotationError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = quotationActorFrom(req);
    const ip = requestIp(req);
    if (!allowSlidingWindow(`quotations:post:${actor.userId}:${ip}`, 20, 15 * 60 * 1000)) {
      throw new QuotationError("Too many quotations. Please try again later.", 429, "RATE_LIMITED");
    }
    const body = (await req.json()) as Record<string, unknown>;
    const data = await createQuotation(actor, body);
    return ok({ data }, 201);
  } catch (e) {
    return handleQuotationError(e);
  }
}
