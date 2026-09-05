import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { commActorFrom, handleCommosError } from "@/lib/commos/http";
import { sendOutbound } from "@/services/communication.service";

export async function POST(req: NextRequest) {
  try {
    const actor = commActorFrom(req);
    const body = (await req.json()) as Record<string, unknown>;
    const data = await sendOutbound(actor, {
      channel: String(body.channel ?? ""),
      leadId: String(body.leadId ?? ""),
      content: typeof body.content === "string" ? body.content : undefined,
      templateId: typeof body.templateId === "string" ? body.templateId : undefined,
      templateApproved: body.templateApproved === true,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleCommosError(e);
  }
}
