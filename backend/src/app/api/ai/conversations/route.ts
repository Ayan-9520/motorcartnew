import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { commActorFrom, handleCommosError } from "@/lib/commos/http";
import { startConversation } from "@/services/ai-agent.service";
import { allowSlidingWindow } from "@/lib/http/sliding-window";
import { requestIp } from "@/lib/http/request-meta";
import { CommosError } from "@/lib/commos/errors";

export async function POST(req: NextRequest) {
  try {
    const actor = commActorFrom(req);
    const ip = requestIp(req);
    if (!allowSlidingWindow(`ai:start:${actor.userId}:${ip}`, 20, 15 * 60 * 1000)) {
      throw new CommosError("Too many AI conversations. Please try again later.", 429, "RATE_LIMITED");
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const data = await startConversation(actor, {
      agentType: typeof body.agentType === "string" ? body.agentType : undefined,
      leadId: typeof body.leadId === "string" ? body.leadId : undefined,
      organizationId: typeof body.organizationId === "string" ? body.organizationId : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleCommosError(e);
  }
}
