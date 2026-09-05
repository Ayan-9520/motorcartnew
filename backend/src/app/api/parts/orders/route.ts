import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { listSellerOrders, placePartOrder } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const data = await listSellerOrders(partnerActorFrom(req));
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const items = Array.isArray(body.items) ? body.items as { productId: string; qty: number }[] : [];
    const data = await placePartOrder(partnerActorFrom(req), {
      sellerId: String(body.sellerId ?? ""),
      items: items.map((i) => ({ productId: String(i.productId), qty: Number(i.qty) })),
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}
