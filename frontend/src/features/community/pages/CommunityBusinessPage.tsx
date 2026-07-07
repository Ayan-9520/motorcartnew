import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Globe, Phone, Store } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { featureFlags } from "@/config/feature-flags";
import {
  fetchBusinessPageApi,
  isCommunityBusinessPagesApiOn,
} from "../services/community-api.service";
import { useCommunityFeed } from "../hooks/useCommunityFeed";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";
import toast from "react-hot-toast";

const ENTITY_LABELS: Record<string, string> = {
  dealer: "Dealer",
  broker: "Broker",
  dsa: "DSA",
  insurance_agent: "Insurance",
  workshop: "Workshop",
  parts_seller: "Parts seller",
  influencer: "Influencer",
};

export function CommunityBusinessPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<{
    profile: Record<string, unknown>;
    viewer: Record<string, unknown>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const useApi = isCommunityBusinessPagesApiOn();
  const feed = useCommunityFeed(
    useApi && page?.profile?.owner_user_id
      ? { authorId: String(page.profile.owner_user_id) }
      : { dealerId: undefined }
  );

  useEffect(() => {
    if (!slug) return;
    if (!useApi) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchBusinessPageApi(slug).then((res) => {
      setPage(res?.data ?? null);
      setLoading(false);
    });
  }, [slug, useApi]);

  if (!slug) return null;

  if (!featureFlags.communityV2 || !featureFlags.communityBusinessPages) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <p className="text-muted-foreground">
          Business pages API is disabled. Use{" "}
          <Link to={`/community/dealers/${slug}`} className="text-primary hover:underline">
            dealer community
          </Link>{" "}
          or enable community flags in staging.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <p className="text-muted-foreground">Business page not found.</p>
        <Link to="/community" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Community home
        </Link>
      </div>
    );
  }

  const p = page.profile;
  const entityType = String(p.entity_type ?? "");
  const social = p.social_links as Record<string, string> | null;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {p.cover_url ? (
        <div
          className="mb-6 h-40 rounded-xl bg-cover bg-center"
          style={{ backgroundImage: `url(${String(p.cover_url)})` }}
        />
      ) : null}
      <div className="flex items-start gap-4">
        {p.logo_url ? (
          <img
            src={String(p.logo_url)}
            alt=""
            className="h-16 w-16 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
            <Store className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{String(p.name)}</h1>
            {p.verification_badge_placeholder ? (
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <BadgeCheck className="h-4 w-4" />
                Verified
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {ENTITY_LABELS[entityType] ?? entityType} · {Number(p.follower_count ?? 0)} followers
          </p>
          {p.description ? (
            <p className="mt-2 text-muted-foreground">{String(p.description)}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        {p.phone ? (
          <span className="inline-flex items-center gap-1">
            <Phone className="h-4 w-4" />
            {String(p.phone)}
          </span>
        ) : null}
        {p.website ? (
          <a
            href={String(p.website)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <Globe className="h-4 w-4" />
            Website
          </a>
        ) : null}
        {p.city ? (
          <span>
            {String(p.city)}
            {p.state ? `, ${String(p.state)}` : ""}
          </span>
        ) : null}
      </div>

      {social && Object.keys(social).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(social).map(([k, v]) => (
            <a
              key={k}
              href={v}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline"
            >
              {k}
            </a>
          ))}
        </div>
      ) : null}

      <div className="mt-6">
        <Button variant="outline" size="sm" disabled>
          {page.viewer?.is_following ? "Following" : "Follow"} (API wired in I2)
        </Button>
      </div>

      <div className="mt-8 space-y-6">
        <PostComposer
          onSubmit={async (body, opts) => {
            await feed.createPost(body, opts);
            toast.success("Posted");
          }}
        />
        {feed.loading ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="space-y-4">
            {feed.posts.map((post) => (
              <PostCard key={post.id} post={post} onLike={() => void feed.like(post)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
