import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Building2, Car, Gavel, Users, Globe, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchBusinessHub,
} from "@/features/business-hub/services/business-hub-api.service";
import { businessProfilePath } from "@/features/business-directory/services/directory-api.service";
import { getApiBaseUrl } from "@/lib/api/base-url";

export function BusinessHubPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [hub, setHub] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      const res = await fetchBusinessHub(slug);
      if (res.ok) setHub(res.data.data);
      else setHub(null);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <p className="container py-8 text-muted-foreground">Loading…</p>;
  if (!hub) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center space-y-3">
        <h1 className="text-xl font-semibold">Business hub</h1>
        <p className="text-sm text-muted-foreground">
          {slug ? "Business profile not found or hub API is still syncing." : "Select a business slug in the URL."}
        </p>
      </div>
    );
  }

  const profile = (hub.community_business_profile ?? {}) as Record<string, unknown>;
  const directory = (hub.directory_listing ?? {}) as Record<string, unknown>;
  const growth = hub.growth_workspace as Record<string, unknown> | null;
  const counts = (hub.counts ?? {}) as Record<string, number>;
  const logo = profile.logo_url ? `${getApiBaseUrl()}${profile.logo_url}` : null;
  const dirPath =
    typeof directory.directory_path === "string"
      ? directory.directory_path
      : businessProfilePath({ entity_type: String(profile.entity_type), slug: String(profile.slug) });

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-4xl">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">MotorCart Business Hub · Read-only</p>

      <div className="flex flex-wrap gap-4 items-start">
        {logo ? (
          <img src={logo} alt="" className="w-20 h-20 rounded-lg object-cover border" />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {String(profile.name ?? slug)}
            {profile.is_verified ? <BadgeCheck className="h-5 w-5 text-primary" /> : null}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{String(profile.description ?? "")}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">{String(profile.entity_type ?? "business")}</Badge>
            <Badge variant="secondary">
              <Users className="h-3 w-3 mr-1 inline" />
              {counts.followers ?? profile.follower_count ?? 0} followers
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Car className="h-4 w-4" /> Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{counts.vehicles ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gavel className="h-4 w-4" /> Auction entries
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{counts.auctions ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Followers
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{counts.followers ?? 0}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Community</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{String(profile.city ?? "")} {String(profile.state ?? "")}</p>
            {profile.website ? (
              <a
                href={String(profile.website)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary underline"
              >
                <Globe className="h-3 w-3" /> Website
              </a>
            ) : null}
            <div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/community/business/${slug}`}>Community page</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Directory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {directory.enabled === false ? (
              <p className="text-muted-foreground">Directory category not linked.</p>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to={dirPath}>
                  Directory listing <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Growth workspace</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {growth ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{String(growth.name)}</span>
                <Badge variant="secondary">{String(growth.subscription_tier)}</Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/growth/workspaces">Open Growth CRM</Link>
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">No growth workspace linked to this business.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
