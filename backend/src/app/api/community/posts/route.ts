import { NextRequest } from "next/server";
import { ok, err, forbidden } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { mapSocialPost } from "@/lib/community/map-post";
import { createSocialPost, getSocialPostById } from "@/services/community-post.service";
import type { SocialPostKind } from "@prisma/client";

export async function POST(req: NextRequest) {
  const gate = await requireCommunityAuth(req, "posts");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const created = await createSocialPost(gate.auth.sub, {
      content: body.content != null ? String(body.content) : undefined,
      media: body.media,
      post_kind: body.post_kind as SocialPostKind | undefined,
      poll_options: body.poll_options,
      poll_ends_at:
        body.poll_ends_at != null ? String(body.poll_ends_at) : null,
      embed_url: body.embed_url != null ? String(body.embed_url) : null,
      group_id: body.group_id != null ? String(body.group_id) : null,
      vehicle_id: body.vehicle_id != null ? String(body.vehicle_id) : null,
      dealer_id: body.dealer_id != null ? String(body.dealer_id) : null,
      broker_id: body.broker_id != null ? String(body.broker_id) : null,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : undefined,
    });

    const loaded = await getSocialPostById(created.id, gate.auth.sub);
    if (!loaded) return err("Post not found", 404);

    const { post, likedByMe } = loaded;
    return ok(
      {
        data: mapSocialPost(
          post,
          post.author.communityProfile,
          post.author,
          likedByMe !== undefined ? { liked_by_me: likedByMe } : undefined
        ),
      },
      201
    );
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "EMPTY_POST") return err("Post content or media required", 400);
      if (e.message === "NOT_MEMBER") {
        return forbidden("You must join this group to post");
      }
      if (e.message === "GROUP_NOT_FOUND") return err("Group not found", 404);
    }
    return err("Could not create post", 400);
  }
}
