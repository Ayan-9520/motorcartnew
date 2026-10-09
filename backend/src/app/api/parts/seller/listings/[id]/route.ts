import { NextRequest } from "next/server";
import { ok, err, forbidden, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { deleteSellerListing, sellerAccessError, updateSellerListing } from "@/lib/parts/parts-store.service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const denied = await sellerAccessError(auth);
  if (denied) return forbidden(denied);
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await updateSellerListing(auth, id, body);
    if (!result.ok) return err(result.error, result.status ?? 400);
    return ok({ data: result.data });
  } catch (e) {
    console.error("[parts:seller:listings:update]", e);
    return err("Could not update listing", 500);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const denied = await sellerAccessError(auth);
  if (denied) return forbidden(denied);
  const { id } = await ctx.params;
  try {
    const result = await deleteSellerListing(auth, id);
    if (!result.ok) return err(result.error, result.status ?? 400);
    return ok({ data: result.data });
  } catch (e) {
    console.error("[parts:seller:listings:delete]", e);
    return err("Could not delete listing", 500);
  }
}
