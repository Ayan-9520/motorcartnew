import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Store } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommunityFeed } from "../hooks/useCommunityFeed";
import { fetchDealerIdBySlug } from "../services/community.service";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";
import toast from "react-hot-toast";

export function CommunityDealerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [dealerId, setDealerId] = useState<string | null>(null);
  const [lookedUp, setLookedUp] = useState(false);
  const feed = useCommunityFeed({ dealerId: dealerId ?? undefined });

  useEffect(() => {
    if (!slug) return;
    void fetchDealerIdBySlug(slug).then((id) => {
      setDealerId(id);
      setLookedUp(true);
    });
  }, [slug]);

  if (!slug) return null;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Store className="h-4 w-4" />
        <span>Dealer community</span>
        <span>·</span>
        <Link to="/community" className="text-primary hover:underline">
          Global feed
        </Link>
      </div>
      <h1 className="mt-4 text-2xl font-bold">/{slug}</h1>
      <p className="text-muted-foreground">Inventory stories, launches & customer wins — scoped to this showroom.</p>
      {!lookedUp ? (
        <Skeleton className="mt-8 h-40" />
      ) : !dealerId ? (
        <p className="mt-8 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No posts yet.
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          <PostComposer
            onSubmit={async (body, opts) => {
              try {
                await feed.createPost(body, { ...opts, dealerId });
                toast.success("Post published.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not publish post");
              }
            }}
          />
          {feed.loading ? (
            <Skeleton className="h-40" />
          ) : feed.posts.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No posts yet.
            </p>
          ) : (
            <div className="space-y-4">
              {feed.posts.map((p) => (
                <PostCard key={p.id} post={p} onLike={() => void feed.like(p)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
