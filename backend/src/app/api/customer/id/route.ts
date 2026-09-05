import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSuperAppError, superActorFrom } from "@/lib/superapp/http";
import { ensureIdentity, getMotorCartOne } from "@/services/motorcart-one.service";

export async function GET(req: NextRequest) {
  try {
    const actor = superActorFrom(req);
    const identity = await ensureIdentity(actor.userId);
    return ok({ data: { publicId: identity.publicId, status: identity.status, issuedAt: identity.issuedAt } });
  } catch (e) {
    return handleSuperAppError(e);
  }
}
