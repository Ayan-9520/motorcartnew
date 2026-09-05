import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { setPageMeta } from "@/utils/seo";
import { cn } from "@/lib/utils";
import { useCommunityFeed } from "../hooks/useCommunityFeed";
import { PostCard } from "../components/PostCard";
import { PostComposer } from "../components/PostComposer";
import { CommunityFeedRightRail } from "../components/CommunityFeedRightRail";
import { flagPost, fetchCommunityNotifications, markNotificationRead } from "../services/community.service";
import toast from "react-hot-toast";

type Tab = "feed" | "following" | "vehicles";

const TABS: { id: Tab; label: string }[] = [
  { id: "feed", label: "Feed" },
  { id: "following", label: "Following" },
  { id: "vehicles", label: "Vehicles" },
];

export function CommunityFeedPage() {
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: Tab =
    tabParam === "following" || tabParam === "vehicles" ? tabParam : "feed";
  const [tab, setTab] = useState<Tab>(initialTab);
  const feed = useCommunityFeed({
    vehicleOnly: tab === "vehicles",
    followingOnly: tab === "following",
  });
  const [notifs, setNotifs] = useState<Awaited<ReturnType<typeof fetchCommunityNotifications>>>([]);

  useEffect(() => {
    setPageMeta({
      title: "Feed — Motorcart Community",
      description: "Real posts from dealers and vehicle owners across India.",
    });
  }, []);

  useEffect(() => {
    if (user?.id) void fetchCommunityNotifications(user.id).then(setNotifs);
  }, [user?.id]);

  useEffect(() => {
    const next = searchParams.get("tab");
    if (next === "following" || next === "vehicles" || next === "feed") {
      setTab(next);
      return;
    }
    if (next === "for_you") {
      setTab("following");
      setSearchParams({ tab: "following" }, { replace: true });
    } else if (next === "trending") {
      setTab("feed");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const setTabAndUrl = (next: Tab) => {
    setTab(next);
    setSearchParams(next === "feed" ? {} : { tab: next }, { replace: true });
  };

  const displayPosts = useMemo(() => {
    if (tab === "feed") {
      return [...feed.posts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return feed.posts;
  }, [feed.posts, tab]);

  const flag = async (postId: string) => {
    if (!user?.id) return toast.error("Sign in to report");
    const reason = window.prompt("Reason for report:") ?? "";
    if (!reason.trim()) return;
    await flagPost({ postId, reporterId: user.id, reason, aiSpamScore: undefined });
    toast.success("Report submitted");
  };

  return (
    <div className="community-feed-page">
      <header className="community-feed-header border-b border-border/80 bg-card/40 backdrop-blur-md">
        <div className="community-feed-header-inner">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Feed</h1>
            <p className="text-sm text-muted-foreground">Real posts — like, comment, share, delete your own</p>
          </div>
          <div className="community-feed-tabs" role="tablist">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTabAndUrl(id)}
                className={cn("community-feed-tab", tab === id && "community-feed-tab-active")}
              >
                {label}
              </button>
            ))}
          </div>
          {user?.role === "admin" && (
            <Button variant="outline" size="sm" className="shrink-0 rounded-full" asChild>
              <Link to="/dashboard/admin/community">
                <Shield className="mr-1 h-3.5 w-3.5" />
                Moderation
              </Link>
            </Button>
          )}
        </div>
      </header>

      <div className="community-feed-body">
        <div className="community-feed-center">
          {feed.tag && (
            <Badge variant="secondary" className="mb-4 rounded-full text-sm">
              #{feed.tag}{" "}
              <Link to="/community" className="ml-2 underline">
                clear
              </Link>
            </Badge>
          )}

          {tab === "following" && !isAuthenticated && (
            <Card className="mb-4 rounded-2xl border-primary/15 p-6 text-center">
              <p className="font-medium">Sign in to see posts from people you follow</p>
              <Button className="mt-4 rounded-xl" asChild>
                <Link to="/login?redirect=/community?tab=following">Sign in</Link>
              </Button>
            </Card>
          )}

          <PostComposer
            disabled={!user}
            onSubmit={async (body, opts) => {
              try {
                await feed.createPost(body, opts);
                toast.success("Post published.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not publish post");
              }
            }}
          />

          {feed.loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : displayPosts.length === 0 ? (
            <Card className="rounded-2xl border-dashed p-10 text-center">
              <p className="font-medium text-foreground">No posts yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {tab === "following"
                  ? "Follow people from their profile — their posts appear here."
                  : isAuthenticated
                    ? "Write something above — your post goes live for everyone."
                    : "Sign in and be the first to post in your city."}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {displayPosts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  premium
                  onLike={() => void feed.like(p)}
                  onShare={() => void feed.share(p)}
                  onSave={() => void feed.save(p)}
                  onFlag={() => void flag(p.id)}
                  onDelete={async () => {
                    const r = await feed.deletePost(p);
                    if (r.ok) toast.success("Post deleted");
                    else toast.error(r.error ?? "Could not delete");
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <CommunityFeedRightRail
          trending={feed.trending}
          groups={feed.groups}
          notifications={notifs}
          onNotificationClick={(id) => user && void markNotificationRead(id, user.id)}
        />
      </div>
    </div>
  );
}
