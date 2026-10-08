import { NextRequest } from "next/server";
import { ok, err, forbidden, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { canSellParts, listSellerOrders } from "@/lib/parts/parts-store.service";

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (!canSellParts(auth)) return forbidden("Parts seller access required");
  try {
    return ok({ data: await listSellerOrders(auth) });
  } catch (e) {
    console.error("[parts:seller:orders]", e);
    return err("Could not load orders", 500);
  }
}
