import { NextRequest } from "next/server";
import { ok, err, forbidden } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { mapCommunityGroup } from "@/lib/community/map-group";
import {
  joinCommunityGroup,
  leaveCommunityGroup,
} from "@/services/community-group.service";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const gate = await requireCommunityAuth(req, "groups");
  if ("response" in gate) return gate.response;

  const { slug } = await ctx.params;
  try {
    const result = await joinCommunityGroup(slug, gate.auth.sub);
    if (!result) return err("Group not found", 404);
    return ok(
      {
        data: {
          joined: result.joined,
          group: mapCommunityGroup(result.group, {
            is_member: true,
            viewer_role: result.membership.role,
          }),
        },
      },
      result.joined ? 201 : 200
    );
  } catch (e) {
    if (e instanceof Error && e.message === "JOIN_CLOSED") {
      return forbidden("This group is not accepting new members");
    }
    return err("Could not join group", 400);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const gate = await requireCommunityAuth(req, "groups");
  if ("response" in gate) return gate.response;

  const { slug } = await ctx.params;
  const result = await leaveCommunityGroup(slug, gate.auth.sub);
  if (!result) return err("Group not found", 404);
  return ok({
    data: {
      left: result.left,
      group: mapCommunityGroup(result.group, { is_member: false, viewer_role: null }),
    },
  });
}
