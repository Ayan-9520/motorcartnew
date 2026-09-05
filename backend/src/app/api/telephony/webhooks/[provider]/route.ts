import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleCommosError } from "@/lib/commos/http";
import { applyCallWebhook } from "@/services/telephony.service";
import { CommosError } from "@/lib/commos/errors";

type Ctx = { params: Promise<{ provider: string }> };

export async function POST(req: NextRequest, _ctx: Ctx) {
  try {
    const secret = process.env.COMM_WEBHOOK_SECRET?.trim();
    if (!secret) throw new CommosError("Provider not configured", 403, "PROVIDER_NOT_CONFIGURED");
    const body = await req.text();
    const signature = req.headers.get("x-signature") ?? "";
    const eventId = req.headers.get("x-event-id") ?? "";
    if (!eventId) throw new CommosError("Missing event id", 400, "EVENT_ID");
    const data = await applyCallWebhook(body, signature, eventId, secret);
    return ok({ data });
  } catch (e) {
    return handleCommosError(e);
  }
}
