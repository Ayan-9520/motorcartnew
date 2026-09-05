import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { requireCommunityAuth, requireCommunityPublic } from "@/lib/community/guard";
import { listFollowing } from "@/services/community-engagement.service";
import { handleCommunityError } from "@/lib/community/http";

export async function GET(req: NextRequest) {
  const gate = requireCommunityPublic("follow");
  if ("response" in gate) return gate.response;

  const auth = getAuthUser(req);
  const requested = new URL(req.url).searchParams.get("user_id");
  const target = requested ?? auth?.sub;
  if (!target) {
    const authed = await requireCommunityAuth(req, "follow");
    if ("response" in authed) return authed.response;
    try {
      const data = await listFollowing(authed.auth.sub);
      return ok({ data });
    } catch (e) {
      return handleCommunityError(e);
    }
  }

  try {
    const data = await listFollowing(target);
    return ok({ data });
  } catch (e) {
    return handleCommunityError(e);
  }
}
