import { NextRequest } from "next/server";
import { ok, err, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { cancelMyOrder, getMyOrder } from "@/lib/parts/parts-store.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const { id } = await ctx.params;
  try {
    const data = await getMyOrder(auth, id);
    if (!data) return err("Order not found", 404);
    return ok({ data });
  } catch (e) {
    console.error("[parts:my-orders:detail]", e);
    return err("Could not load order", 500);
  }
}

/** Customer cancellation (pending / confirmed only). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: string; reason?: string };
  if (body.action !== "cancel") return err("Unsupported action");
  try {
    const result = await cancelMyOrder(auth, id, body.reason);
    if (!result.ok) return err(result.error, result.status ?? 400);
    return ok({ data: result.data });
  } catch (e) {
    console.error("[parts:my-orders:cancel]", e);
    return err("Could not cancel order", 500);
  }
}
