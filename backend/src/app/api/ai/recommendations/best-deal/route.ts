import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { commActorFrom, handleCommosError } from "@/lib/commos/http";
import { recommendBestDeal } from "@/services/best-deal.service";

export async function POST(req: NextRequest) {
  try {
    const actor = commActorFrom(req);
    const body = (await req.json()) as { query?: string; pincode?: string };
    const data = await recommendBestDeal(actor, String(body.query ?? ""), body.pincode);
    return ok({ data });
  } catch (e) {
    return handleCommosError(e);
  }
}
