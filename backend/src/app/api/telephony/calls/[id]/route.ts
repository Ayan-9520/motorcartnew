import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { commActorFrom, handleCommosError } from "@/lib/commos/http";
import { attachRecording, getCall, getRecording } from "@/services/telephony.service";
import { assertDialerLocked } from "@/lib/sales-os/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const actor = commActorFrom(req);
    assertDialerLocked();
    const { id } = await ctx.params;
    const recording = req.nextUrl.searchParams.get("recording") === "1";
    const data = recording ? await getRecording(actor, id) : await getCall(actor, id);
    return ok({ data });
  } catch (e) {
    return handleCommosError(e);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const actor = commActorFrom(req);
    assertDialerLocked();
    const { id } = await ctx.params;
    const body = (await req.json()) as { providerRef?: string };
    const data = await attachRecording(actor, id, String(body.providerRef ?? ""));
    return ok({ data }, 201);
  } catch (e) {
    return handleCommosError(e);
  }
}
