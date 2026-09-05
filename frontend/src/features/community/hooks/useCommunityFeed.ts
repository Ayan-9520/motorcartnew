import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  computeTrendingHashtags,
  createCommunityPost,
  deleteCommunityPost,
  fetchCommunityFeed,
  fetchCommunityGroups,
  savePost,
  sharePost,
  togglePostLike,
} from "../services/community.service";
import type { CommunityGroup, CommunityPost, HashtagTrend } from "../types";

export function useCommunityFeed(opts?: {
  groupSlug?: string;
  dealerId?: string;
  vehicleOnly?: boolean;
  authorId?: string;
  followingOnly?: boolean;
}) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const tag = params.get("tag") ?? undefined;
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [trending, setTrending] = useState<HashtagTrend[]>([]);
  const [loading, setLoading] = useState(true);

  const groupIdForSlug = useMemo(
    () => groups.find((g) => g.slug === opts?.groupSlug)?.id ?? null,
    [groups, opts?.groupSlug]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, g] = await Promise.all([
        fetchCommunityFeed({
          hashtag: tag,
          groupSlug: opts?.groupSlug,
          dealerId: opts?.dealerId,
          vehicleOnly: opts?.vehicleOnly,
          authorId: opts?.authorId,
          followingOnly: opts?.followingOnly,
          currentUserId: user?.id ?? null,
          limit: 40,
        }),
        fetchCommunityGroups(),
      ]);
      setPosts(p);
      setGroups(g);
      setTrending(computeTrendingHashtags(p, 14));
    } finally {
      setLoading(false);
    }
  }, [tag, opts?.groupSlug, opts?.dealerId, opts?.vehicleOnly, opts?.authorId, opts?.followingOnly, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const createPost = useCallback(
    async (
      body: string,
      extras?: {
        embedUrl?: string | null;
        pollOptions?: string[] | null;
        mediaUrls?: string[];
        groupId?: string | null;
        dealerId?: string | null;
      }
    ) => {
      if (!user?.id) throw new Error("Sign in required to post");
      const created = await createCommunityPost({
        authorId: user.id,
        authorName: user.fullName,
        body,
        mediaUrls: extras?.mediaUrls,
        groupId: extras?.groupId ?? groupIdForSlug,
        dealerId: extras?.dealerId ?? opts?.dealerId ?? null,
        embedUrl: extras?.embedUrl ?? null,
        pollOptions: extras?.pollOptions ?? null,
      });
      await load();
      return created;
    },
    [user, load, groupIdForSlug, opts?.dealerId]
  );

  const like = useCallback(
    async (post: CommunityPost) => {
      if (!user?.id) return;
      await togglePostLike(post.id, user.id, Boolean(post.likedByMe));
      await load();
    },
    [user?.id, load]
  );

  const share = useCallback(
    async (post: CommunityPost) => {
      if (!user?.id) return;
      await sharePost(post.id, user.id);
      await load();
    },
    [user?.id, load]
  );

  const save = useCallback(
    async (post: CommunityPost) => {
      if (!user?.id) return;
      await savePost(post.id, Boolean(post.savedByMe));
      await load();
    },
    [user?.id, load]
  );

  const deletePost = useCallback(
    async (post: CommunityPost) => {
      if (!user?.id || post.authorId !== user.id) return { ok: false as const, error: "Not allowed" };
      const result = await deleteCommunityPost(post.id, user.id);
      if (result.ok) await load();
      return result;
    },
    [user?.id]
  );

  return { posts, groups, trending, loading, tag, reload: load, createPost, like, share, save, deletePost };
}
