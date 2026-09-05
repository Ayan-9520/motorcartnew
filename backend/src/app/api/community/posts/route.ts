import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { mapSocialPost } from "@/lib/community/map-post";
import { communityRateLimit, handleCommunityError } from "@/lib/community/http";
import { createSocialPost, getSocialPostById } from "@/services/community-post.service";
import type { SocialPostKind } from "@prisma/client";

export async function POST(req: NextRequest) {
  const gate = await requireCommunityAuth(req, "posts");
  if ("response" in gate) return gate.response;

  const limited = communityRateLimit(req, gate.auth.sub, "post", 20);
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const created = await createSocialPost(gate.auth.sub, {
      content: body.content != null ? String(body.content) : undefined,
      media: body.media,
      post_kind: body.post_kind as SocialPostKind | undefined,
      poll_options: body.poll_options,
      poll_ends_at: body.poll_ends_at != null ? String(body.poll_ends_at) : null,
      embed_url: body.embed_url != null ? String(body.embed_url) : null,
      group_id: body.group_id != null ? String(body.group_id) : null,
      vehicle_id: body.vehicle_id != null ? String(body.vehicle_id) : null,
      dealer_id: body.dealer_id != null ? String(body.dealer_id) : null,
      organization_id: body.organization_id != null ? String(body.organization_id) : null,
      inventory_id: body.inventory_id != null ? String(body.inventory_id) : null,
      author_id: body.author_id != null ? String(body.author_id) : body.authorUserId != null ? String(body.authorUserId) : null,
      author_user_id: body.author_user_id != null ? String(body.author_user_id) : null,
      visibility: body.visibility != null ? String(body.visibility) : null,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : undefined,
    });

    const loaded = await getSocialPostById(created.id, gate.auth.sub);
    if (!loaded) return err("Post not found", 404);

    const { post, likedByMe, savedByMe } = loaded;
    return ok(
      {
        data: mapSocialPost(post, post.author.communityProfile, post.author, {
          liked_by_me: likedByMe,
          saved_by_me: savedByMe,
        }),
      },
      201
    );
  } catch (e) {
    return handleCommunityError(e);
  }
}
