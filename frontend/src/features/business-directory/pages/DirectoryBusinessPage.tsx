import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Globe, Phone, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  fetchDirectoryBusiness,
  fetchDirectoryFeed,
  followDirectoryBusiness,
  isDirectoryEnabled,
  unfollowDirectoryBusiness,
} from "@/features/business-directory/services/directory-api.service";
import { useAuthStore } from "@/store/authStore";
import { getApiBaseUrl } from "@/lib/api/base-url";

export function DirectoryBusinessPage() {
  const { category = "dealers", slug = "" } = useParams<{ category: string; slug: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [feed, setFeed] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!slug || !isDirectoryEnabled()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [p, f] = await Promise.all([
      fetchDirectoryBusiness(category, slug),
      fetchDirectoryFeed(slug),
    ]);
    if (p.ok) setProfile(p.data.data);
    if (f.ok) setFeed(f.data.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [category, slug]);

  if (!isDirectoryEnabled()) {
    return <p className="container py-16 text-center text-muted-foreground">Directory disabled.</p>;
  }

  if (loading) return <p className="container py-8 text-muted-foreground">Loading…</p>;
  if (!profile) return <p className="container py-8">Business not found.</p>;

  const viewer = profile.viewer as { is_following?: boolean } | undefined;
  const growthWs = profile.growth_workspace as { slug?: string; name?: string } | null;
  const logo = profile.logo_url ? `${getApiBaseUrl()}${profile.logo_url}` : null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-3xl">
      <Link to={`/directory/${category}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← Back
      </Link>

      {profile.cover_url ? (
        <div
          className="h-40 rounded-xl bg-cover bg-center"
          style={{ backgroundImage: `url(${getApiBaseUrl()}${profile.cover_url})` }}
        />
      ) : null}

      <div className="flex flex-wrap gap-4 items-start">
        {logo ? (
          <img src={logo} alt="" className="w-20 h-20 rounded-lg object-cover border" />
        ) : null}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {String(profile.name)}
            {profile.is_verified ? <BadgeCheck className="h-5 w-5 text-primary" /> : null}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{String(profile.tagline ?? "")}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">{String(profile.entity_type)}</Badge>
            <Badge variant="secondary">{Number(profile.follower_count ?? 0)} followers</Badge>
          </div>
        </div>
        {isAuthenticated ? (
          <Button
            size="sm"
            variant={viewer?.is_following ? "outline" : "default"}
            onClick={() =>
              void (viewer?.is_following
                ? unfollowDirectoryBusiness(slug)
                : followDirectoryBusiness(slug)
              ).then(load)
            }
          >
            {viewer?.is_following ? "Unfollow" : "Follow business"}
          </Button>
        ) : null}
      </div>

      {profile.about ? (
        <Card className="p-4">
          <h2 className="font-medium text-sm mb-2">About</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{String(profile.about)}</p>
        </Card>
      ) : null}

      {Array.isArray(profile.services) && profile.services.length > 0 ? (
        <Card className="p-4">
          <h2 className="font-medium text-sm mb-2">Services</h2>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {(profile.services as unknown[]).map((s, i) => (
              <li key={i}>{typeof s === "string" ? s : JSON.stringify(s)}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="p-4 space-y-2 text-sm">
        <h2 className="font-medium">Contact</h2>
        {profile.phone ? (
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4" /> {String(profile.phone)}
          </p>
        ) : null}
        {profile.website ? (
          <a
            href={String(profile.website)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-primary underline"
          >
            <Globe className="h-4 w-4" /> Website
          </a>
        ) : null}
        {profile.social_links ? (
          <p className="text-xs text-muted-foreground">Social: {JSON.stringify(profile.social_links)}</p>
        ) : null}
      </Card>

      {growthWs?.slug ? (
        <Card className="p-4">
          <h2 className="font-medium text-sm mb-2">Growth workspace</h2>
          <p className="text-sm">{growthWs.name}</p>
          <Link
            to={`/dashboard/growth/workspaces`}
            className="text-xs text-primary underline mt-1 inline-flex items-center gap-1"
          >
            Open Growth CRM <ExternalLink className="h-3 w-3" />
          </Link>
        </Card>
      ) : null}

      <div>
        <h2 className="font-medium text-lg mb-3">Business feed</h2>
        {feed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          <ul className="space-y-3">
            {feed.map((post) => (
              <Card key={String(post.id)} className="p-4">
                <p className="text-sm">{String(post.content)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(String(post.created_at)).toLocaleString()}
                </p>
              </Card>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
