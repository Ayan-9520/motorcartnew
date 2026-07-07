import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { requireCommunityPublic } from "@/lib/community/guard";
import { mapCommunityGroup } from "@/lib/community/map-group";
import { getGroupDetail } from "@/services/community-group.service";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const gate = requireCommunityPublic("groups");
  if ("response" in gate) return gate.response;

  const { slug } = await ctx.params;
  const auth = getAuthUser(req);
  const detail = await getGroupDetail(slug, auth?.sub ?? null);
  if (!detail) return err("Group not found", 404);

  return ok({
    data: mapCommunityGroup(detail.group, {
      is_member: detail.is_member,
      viewer_role: detail.viewer_role,
      rules: detail.rules,
    }),
  });
}
