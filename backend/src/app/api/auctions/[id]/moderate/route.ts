import { NextRequest } from "next/server";
import { ok, err, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { moderateAuctionLot } from "@/lib/auctions/auction-engine";

type Ctx = { params: Promise<{ id: string }> };

/** Admin approve / reject a pending (dealer or customer submitted) lot. */
export async function POST(req: NextRequest, context: Ctx) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const body = (await req.json().catch(() => ({}))) as { decision?: string; note?: string };
  if (body.decision !== "approve" && body.decision !== "reject") return err("decision must be approve or reject", 400);
  try {
    const result = await moderateAuctionLot(auth, id, body.decision, body.note?.slice(0, 500));
    if (!result.ok) return err(result.error ?? "Could not update auction", result.error?.startsWith("Only admins") ? 403 : 400);
    return ok({ data: result });
  } catch (e) {
    console.error("[auctions:moderate]", e);
    return err("Could not update auction", 500);
  }
}
