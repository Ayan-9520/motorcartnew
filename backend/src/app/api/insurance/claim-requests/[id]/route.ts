import { NextRequest } from "next/server";
import { ok, err, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { updateClaimRequest, type ClaimUpdate } from "@/lib/insurance/insurance-desk.service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as ClaimUpdate;
  try {
    const result = await updateClaimRequest(auth, id, body);
    if (!result.ok) return err(result.error, result.status ?? 400);
    return ok({ data: result.data });
  } catch (e) {
    console.error("[insurance:claim-requests:update]", e);
    return err("Could not update claim", 500);
  }
}
