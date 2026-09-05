import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireCommunityPublic } from "@/lib/community/guard";
import { discoverCommunity, findDealerIdBySlug } from "@/services/community-discover.service";
import { handleCommunityError } from "@/lib/community/http";

export async function GET(req: NextRequest) {
  const gate = requireCommunityPublic("profiles");
  if ("response" in gate) return gate.response;

  const sp = new URL(req.url).searchParams;
  const dealerSlug = sp.get("dealer_slug");
  if (dealerSlug) {
    const id = await findDealerIdBySlug(dealerSlug);
    return ok({ data: { dealer_id: id } });
  }

  try {
    const data = await discoverCommunity({
      q: sp.get("q"),
      city: sp.get("city"),
      profile_type: sp.get("profile_type"),
      kind: sp.get("kind"),
      limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
    });
    return ok({ data });
  } catch (e) {
    return handleCommunityError(e);
  }
}
