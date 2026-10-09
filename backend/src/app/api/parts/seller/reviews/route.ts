import { NextRequest } from "next/server";
import { ok, err, forbidden, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { listSellerReviews, sellerAccessError } from "@/lib/parts/parts-store.service";

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const denied = await sellerAccessError(auth);
  if (denied) return forbidden(denied);
  try {
    return ok({ data: await listSellerReviews(auth) });
  } catch (e) {
    console.error("[parts:seller:reviews]", e);
    return err("Could not load reviews", 500);
  }
}
