import { NextRequest } from "next/server";
import { ok, err, forbidden, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { canSellParts, createSellerListing, listSellerListings } from "@/lib/parts/parts-store.service";

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (!canSellParts(auth)) return forbidden("Parts seller access required");
  try {
    return ok({ data: await listSellerListings(auth) });
  } catch (e) {
    console.error("[parts:seller:listings]", e);
    return err("Could not load listings", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await createSellerListing(auth, body);
    if (!result.ok) return err(result.error, result.status ?? 400);
    return ok({ data: result.data }, 201);
  } catch (e) {
    console.error("[parts:seller:listings:create]", e);
    return err("Could not create listing", 500);
  }
}
