import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSuperAppError, superActorFrom } from "@/lib/superapp/http";
import { getMotorCartOne, issueQrToken, revokeQrTokens } from "@/services/motorcart-one.service";

export async function GET(req: NextRequest) {
  try {
    const actor = superActorFrom(req);
    const data = await getMotorCartOne(actor);
    return ok({ data });
  } catch (e) {
    return handleSuperAppError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = superActorFrom(req);
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    if (body.action === "revoke") return ok({ data: await revokeQrTokens(actor) });
    return ok({ data: await issueQrToken(actor) });
  } catch (e) {
    return handleSuperAppError(e);
  }
}
