import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, handleCommercialError } from "@/lib/commercial/http";
import { processPaymentWebhook } from "@/services/commercial-billing.service";

export async function POST(req: NextRequest) {
  try {
    assertCommercialOn();
    const raw = await req.text();
    const signature = req.headers.get("x-commercial-signature");
    const data = await processPaymentWebhook(raw, signature);
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
