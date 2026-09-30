import { NextRequest } from "next/server";
import { ok, err, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { myAuctionActivity, sweepAuctionStatuses } from "@/lib/auctions/auction-engine";

/** Bids (with leading / outbid / won / lost standing) and lots the signed-in user organised. */
export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  try {
    await sweepAuctionStatuses();
    return ok({ data: await myAuctionActivity(auth) });
  } catch (e) {
    console.error("[auctions:my]", e);
    return err("Could not load auction activity", 500);
  }
}
