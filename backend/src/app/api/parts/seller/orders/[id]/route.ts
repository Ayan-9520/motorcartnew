import { NextRequest } from "next/server";
import { ok, err, forbidden, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { sellerAccessError, updateSellerOrder, type SellerOrderUpdate } from "@/lib/parts/parts-store.service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const denied = await sellerAccessError(auth);
  if (denied) return forbidden(denied);
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as SellerOrderUpdate;
  try {
    const result = await updateSellerOrder(auth, id, body);
    if (!result.ok) return err(result.error, result.status ?? 400);
    return ok({ data: result.data });
  } catch (e) {
    console.error("[parts:seller:orders:update]", e);
    return err("Could not update order", 500);
  }
}
