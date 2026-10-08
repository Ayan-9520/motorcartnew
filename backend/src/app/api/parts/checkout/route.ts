import { NextRequest } from "next/server";
import { ok, err, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { checkoutParts, type CheckoutInput } from "@/lib/parts/parts-store.service";

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as CheckoutInput;
  try {
    const result = await checkoutParts(auth, body);
    if (!result.ok) return err(result.error, result.status ?? 400);
    return ok({ data: result.data }, 201);
  } catch (e) {
    console.error("[parts:checkout]", e);
    return err("Could not place order — please try again", 500);
  }
}
