import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertAiCallingLocked, handleSalesOsError, salesActorFrom } from "@/lib/sales-os/http";
import { initiateCall } from "@/services/telephony.service";
import { handleCommosError } from "@/lib/commos/http";

export async function POST(req: NextRequest) {
  try {
    const actor = salesActorFrom(req);
    assertAiCallingLocked();
    const body = (await req.json()) as { leadId?: string };
    const data = await initiateCall(actor, { leadId: String(body.leadId ?? ""), aiCalling: true });
    return ok({ data }, 201);
  } catch (e) {
    const sales = handleSalesOsError(e);
    if (sales.status !== 400) return sales;
    return handleCommosError(e);
  }
}
