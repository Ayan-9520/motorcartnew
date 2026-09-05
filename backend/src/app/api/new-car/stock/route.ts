import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { listPublicNewCarStock } from "@/services/dealer-inventory.service";

/** Public new-car stock discovery from NewCarInventory (not catalog master). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const data = await listPublicNewCarStock({
    brand: sp.get("brand") ?? undefined,
    model: sp.get("model") ?? undefined,
    pincode: sp.get("pincode") ?? undefined,
    q: sp.get("q") ?? undefined,
    limit: sp.get("limit") ? Number(sp.get("limit")) : 24,
  });
  return ok({ data });
}
