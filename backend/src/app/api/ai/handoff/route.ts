import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { commActorFrom, handleCommosError } from "@/lib/commos/http";
import { handoff } from "@/services/ai-agent.service";

export async function POST(req: NextRequest) {
  try {
    const actor = commActorFrom(req);
    const body = (await req.json()) as { conversationId?: string; assigneeUserId?: string };
    const data = await handoff(actor, String(body.conversationId ?? ""), body.assigneeUserId);
    return ok({ data });
  } catch (e) {
    return handleCommosError(e);
  }
}
