import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Grid3X3, LayoutList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { setPageMeta } from "@/utils/seo";
import { cn } from "@/lib/utils";
import { useCommunityFeed } from "../hooks/useCommunityFeed";
import { PostCard } from "../components/PostCard";
import { PostComposer } from "../components/PostComposer";
import { SocialAvatar } from "../components/SocialAvatar";
import { CommunityEditProfileDialog } from "../components/CommunityEditProfileDialog";
import {
  fetchSocialProfile,
  fetchFollowersList,
  fetchFollowingList,
} from "../services/community-profile.service";
import { followUser, unfollowUser } from "../services/community.service";
import type { SocialProfile } from "../types";
import toast from "react-hot-toast";

export function CommunityProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user, isAuthenticated } = useAuth();
  const feed = useCommunityFeed({ authorId: userId });
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [view, setView] = useState<"feed" | "media">("feed");
  const [listMode, setListMode] = useState<"followers" | "following" | null>(null);
  const [listUsers, setListUsers] = useState<SocialProfile[]>([]);

  const refreshProfile = () => {
    if (!userId) return;
    void fetchSocialProfile(userId, user?.id ?? null).then(setProfile);
  };

  useEffect(() => {
    if (!userId) return;
    setLoadingProfile(true);
    void fetchSocialProfile(userId, user?.id ?? null).then((p) => {
      setProfile(p);
      setLoadingProfile(false);
      if (p) {
        setPageMeta({
          title: `${p.fullName} — Motorcart Community`,
          description: p.bio ?? "Automotive community profile on Motorcart.in",
        });
      }
    });
  }, [userId, user?.id]);

  const toggleFollow = async () => {
    if (!user?.id || !profile || profile.isSelf) return;
    if (profile.isFollowing) {
      await unfollowUser(user.id, profile.id);
      setProfile({ ...profile, isFollowing: false, followerCount: Math.max(0, profile.followerCount - 1) });
      toast.success("Unfollowed");
    } else {
      await followUser(user.id, profile.id);
      setProfile({ ...profile, isFollowing: true, followerCount: profile.followerCount + 1 });
      toast.success("Following");
    }
  };

  const openList = async (mode: "followers" | "following") => {
    if (!userId) return;
    setListMode(mode);
    const list = mode === "followers" ? await fetchFollowersList(userId) : await fetchFollowingList(userId);
    setListUsers(list);
  };

  if (!userId) return null;

  const mediaPosts = feed.posts.filter((p) => p.mediaUrls?.length);
  const livePostCount = feed.posts.length;

  return (
    <div className="community-social-profile community-feed-page min-h-screen bg-background pb-24 lg:pb-16">
      <div className="community-profile-cover-wrap">
        {profile?.coverUrl ? (
          <img src={profile.coverUrl} alt="" className="community-profile-cover-img" />
        ) : (
          <div className="community-profile-cover-placeholder" />
        )}
      </div>

      <div className="container max-w-2xl px-4">
        {loadingProfile || !profile ? (
          <Skeleton className="mt-6 h-32 w-full rounded-2xl" />
        ) : (
          <header className="community-profile-header mt-4">
            <SocialAvatar
              userId={profile.id}
              name={profile.fullName}
              src={profile.avatarUrl}
              verified={profile.isVerified}
              size="xl"
              className="-mt-14 border-4 border-background shadow-md"
            />
            <div className="min-w-0 flex-1 pt-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{profile.fullName}</h1>
              {profile.handle && (
                <p className="text-sm text-muted-foreground">@{profile.handle}</p>
              )}
              {profile.headline && (
                <p className="mt-1 text-sm text-muted-foreground">{profile.headline}</p>
              )}
              {profile.bio && (
                <p className="mt-2 text-sm leading-relaxed text-foreground">{profile.bio}</p>
              )}
              <p className="mt-1 text-xs capitalize text-muted-foreground">
                {(profile.profileType ?? profile.role).replace(/_/g, " ").toLowerCase()}
                {profile.city || profile.state
                  ? ` · ${[profile.city, profile.state].filter(Boolean).join(", ")}`
                  : ""}
                {profile.isVerified ? " · Verified" : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {profile.isSelf ? (
                <Button className="rounded-xl" onClick={() => setEditOpen(true)}>
                  Edit profile
                </Button>
              ) : isAuthenticated ? (
                <Button
                  variant={profile.isFollowing ? "outline" : "default"}
                  className="rounded-xl"
                  onClick={() => void toggleFollow()}
                >
                  {profile.isFollowing ? "Following" : "Follow"}
                </Button>
              ) : (
                <Button className="rounded-xl" asChild>
                  <Link to="/login">Sign in to follow</Link>
                </Button>
              )}
            </div>
          </header>
        )}

        {profile && (
          <div className="community-profile-stats">
            <button type="button" className="community-profile-stat" onClick={() => void openList("followers")}>
              <strong>{profile.followerCount}</strong>
              <span>Followers</span>
            </button>
            <button type="button" className="community-profile-stat" onClick={() => void openList("following")}>
              <strong>{profile.followingCount}</strong>
              <span>Following</span>
            </button>
            <div className="community-profile-stat">
              <strong>{livePostCount || profile.postCount}</strong>
              <span>Posts</span>
            </div>
          </div>
        )}

        {listMode && (
          <div className="community-profile-list-panel">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold capitalize">{listMode}</p>
              <Button variant="ghost" size="sm" onClick={() => setListMode(null)}>
                Close
              </Button>
            </div>
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {listUsers.map((u) => (
                <li key={u.id}>
                  <Link to={`/community/u/${u.id}`} className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/50">
                    <SocialAvatar userId={u.id} name={u.fullName} src={u.avatarUrl} size="sm" />
                    <span className="text-sm font-medium">{u.fullName}</span>
                  </Link>
                </li>
              ))}
              {listUsers.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  {listMode === "followers" ? "No followers yet." : "No following yet."}
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="mt-6">
          <PostComposer
            disabled={!user}
            onSubmit={async (body, opts) => {
              try {
                await feed.createPost(body, opts);
                refreshProfile();
                toast.success("Post published.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not publish post");
              }
            }}
          />
        </div>

        <div className="community-profile-tabs">
          <button
            type="button"
            className={cn("community-profile-tab", view === "feed" && "community-profile-tab-active")}
            onClick={() => setView("feed")}
          >
            <LayoutList className="mr-1.5 inline h-4 w-4" />
            Posts
          </button>
          <button
            type="button"
            className={cn("community-profile-tab", view === "media" && "community-profile-tab-active")}
            onClick={() => setView("media")}
          >
            <Grid3X3 className="mr-1.5 inline h-4 w-4" />
            Photos
          </button>
        </div>

        {feed.loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {(view === "feed" ? feed.posts : mediaPosts).length === 0 && (
              <p className="rounded-2xl border border-dashed border-primary/20 bg-primary/[0.03] p-8 text-center text-sm text-muted-foreground">
                {profile?.isSelf
                  ? "Share your first post above — photos, reviews, or #hashtags show up here."
                  : "No posts yet."}
              </p>
            )}
            {view === "media" && mediaPosts.length > 0 && (
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {mediaPosts.map((p) => (
                  <Link
                    key={p.id}
                    to={`/community/post/${p.id}`}
                    className="aspect-square overflow-hidden rounded-lg border transition-opacity hover:opacity-90"
                  >
                    <img src={p.mediaUrls[0]} alt="" className="h-full w-full object-cover" />
                  </Link>
                ))}
              </div>
            )}
            {view === "feed" &&
              feed.posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  premium
                  onLike={() => void feed.like(p)}
                  onDelete={
                    profile?.isSelf
                      ? async () => {
                          const r = await feed.deletePost(p);
                          if (r.ok) {
                            toast.success("Post deleted");
                            refreshProfile();
                          } else toast.error(r.error ?? "Could not delete");
                        }
                      : undefined
                  }
                />
              ))}
          </div>
        )}
      </div>

      {profile?.isSelf && (
        <CommunityEditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
          onSaved={(p) => setProfile(p)}
        />
      )}
    </div>
  );
}
