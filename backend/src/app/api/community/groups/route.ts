import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { requireCommunityPublic } from "@/lib/community/guard";
import { mapCommunityGroup } from "@/lib/community/map-group";
import { listCommunityGroups } from "@/services/community-group.service";

export async function GET(req: NextRequest) {
  const gate = requireCommunityPublic("groups");
  if ("response" in gate) return gate.response;

  const { searchParams } = new URL(req.url);
  const auth = getAuthUser(req);

  const result = await listCommunityGroups({
    category: searchParams.get("category"),
    visibility: searchParams.get("visibility"),
    q: searchParams.get("q"),
    cursor: searchParams.get("cursor"),
    limit: searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined,
    viewerId: auth?.sub ?? null,
  });

  return ok({
    data: result.items.map(({ group, is_member, viewer_role }) =>
      mapCommunityGroup(group, { is_member, viewer_role })
    ),
    next_cursor: result.next_cursor,
  });
}
