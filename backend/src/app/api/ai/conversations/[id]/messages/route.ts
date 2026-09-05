import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { commActorFrom, handleCommosError } from "@/lib/commos/http";
import { postMessage, runTool } from "@/services/ai-agent.service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const actor = commActorFrom(req);
    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    if (typeof body.tool === "string") {
      const data = await runTool(actor, id, body.tool, (body.input as Record<string, unknown>) ?? {});
      return ok({ data });
    }
    const data = await postMessage(actor, id, String(body.content ?? ""), body.system);
    return ok({ data });
  } catch (e) {
    return handleCommosError(e);
  }
}
