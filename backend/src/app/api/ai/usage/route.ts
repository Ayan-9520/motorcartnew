import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { commActorFrom, handleCommosError } from "@/lib/commos/http";
import { listUsage } from "@/services/ai-agent.service";

export async function GET(req: NextRequest) {
  try {
    const actor = commActorFrom(req);
    const data = await listUsage(actor);
    return ok({ data });
  } catch (e) {
    return handleCommosError(e);
  }
}
