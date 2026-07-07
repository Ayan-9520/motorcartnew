import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireCommunityPublic } from "@/lib/community/guard";
import { mapGroupMember } from "@/lib/community/map-group";
import { listGroupMembers } from "@/services/community-group.service";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const gate = requireCommunityPublic("groups");
  if ("response" in gate) return gate.response;

  const { slug } = await ctx.params;
  const { searchParams } = new URL(req.url);

  const result = await listGroupMembers(slug, {
    role: searchParams.get("role"),
    cursor: searchParams.get("cursor"),
    limit: searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined,
  });

  if (!result) return err("Group not found", 404);

  return ok({
    data: result.members.map((m) => mapGroupMember(m)),
    next_cursor: result.next_cursor,
  });
}
