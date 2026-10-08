import { NextRequest } from "next/server";
import { ok, err, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { listMyOrders } from "@/lib/parts/parts-store.service";

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  try {
    return ok({ data: await listMyOrders(auth) });
  } catch (e) {
    console.error("[parts:my-orders]", e);
    return err("Could not load orders", 500);
  }
}
