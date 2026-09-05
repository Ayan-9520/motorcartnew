import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { commActorFrom, handleCommosError } from "@/lib/commos/http";
import { summarizeCall } from "@/services/ai-agent.service";

export async function POST(req: NextRequest) {
  try {
    const actor = commActorFrom(req);
    const body = (await req.json()) as { callSessionId?: string };
    const data = await summarizeCall(actor, String(body.callSessionId ?? ""));
    return ok({ data });
  } catch (e) {
    return handleCommosError(e);
  }
}
