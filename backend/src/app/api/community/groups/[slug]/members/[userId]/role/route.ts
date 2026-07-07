import { NextRequest } from "next/server";
import { ok, err, forbidden } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { mapGroupMember } from "@/lib/community/map-group";
import { setGroupMemberRole } from "@/services/community-group.service";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string; userId: string }> }
) {
  const gate = await requireCommunityAuth(req, "groupModeration");
  if ("response" in gate) return gate.response;

  const { slug, userId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const role = body.role != null ? String(body.role) : "";
  if (!role) return err("role is required", 400);

  try {
    const result = await setGroupMemberRole(slug, gate.auth.sub, userId, role);
    if (!result) return err("Member not found", 404);
    return ok({ data: mapGroupMember(result.member) });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "FORBIDDEN") return forbidden("Insufficient permissions");
      if (e.message === "INVALID_ROLE") return err("Invalid role", 400);
    }
    return err("Could not update role", 400);
  }
}
