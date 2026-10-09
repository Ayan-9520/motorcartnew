import { NextRequest } from "next/server";
import { ok, err, forbidden, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { bulkCreateSellerListings, sellerAccessError } from "@/lib/parts/parts-store.service";

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const denied = await sellerAccessError(auth);
  if (denied) return forbidden(denied);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await bulkCreateSellerListings(auth, body.rows);
    if (!result.ok) return err(result.error, result.status ?? 400);
    return ok({ data: result.data });
  } catch (e) {
    console.error("[parts:seller:listings:bulk]", e);
    return err("Could not import parts", 500);
  }
}
