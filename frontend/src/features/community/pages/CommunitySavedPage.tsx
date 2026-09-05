import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { setPageMeta } from "@/utils/seo";
import { fetchSavedPosts } from "../services/community.service";
import { PostCard } from "../components/PostCard";
import type { CommunityPost } from "../types";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function CommunitySavedPage() {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta({ title: "Saved posts — MotorCart Community", description: "Posts you saved." });
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void fetchSavedPosts()
      .then(setPosts)
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <div className="community-feed-page">
      <header className="community-feed-header border-b border-border/80 bg-card/40">
        <div className="community-feed-header-inner">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Saved posts</h1>
            <p className="text-sm text-muted-foreground">Bookmarks from MotorCart Community</p>
          </div>
        </div>
      </header>
      <div className="community-feed-center px-4 py-6">
        {!isAuthenticated ? (
          <Card className="rounded-2xl p-8 text-center">
            <p className="font-medium">Sign in to see saved posts.</p>
            <Button className="mt-4 rounded-xl" asChild>
              <Link to="/login?redirect=/community/saved">Sign in</Link>
            </Button>
          </Card>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <Card className="rounded-2xl border-dashed p-10 text-center">
            <p className="font-medium">No saved posts yet.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
