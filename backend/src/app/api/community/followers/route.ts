import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { requireCommunityAuth, requireCommunityPublic } from "@/lib/community/guard";
import { listFollowers } from "@/services/community-engagement.service";
import { handleCommunityError } from "@/lib/community/http";

export async function GET(req: NextRequest) {
  const gate = requireCommunityPublic("follow");
  if ("response" in gate) return gate.response;

  const requested = new URL(req.url).searchParams.get("user_id");
  const auth = getAuthUser(req);
  const target = requested ?? auth?.sub;
  if (!target) {
    const authed = await requireCommunityAuth(req, "follow");
    if ("response" in authed) return authed.response;
    try {
      return ok({ data: await listFollowers(authed.auth.sub) });
    } catch (e) {
      return handleCommunityError(e);
    }
  }

  try {
    return ok({ data: await listFollowers(target) });
  } catch (e) {
    return handleCommunityError(e);
  }
}
