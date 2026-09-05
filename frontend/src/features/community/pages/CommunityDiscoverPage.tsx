import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { setPageMeta } from "@/utils/seo";
import { fetchCommunityDiscover } from "../services/community.service";
import { SocialAvatar } from "../components/SocialAvatar";

export function CommunityDiscoverPage() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [kind, setKind] = useState("all");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    people: Record<string, unknown>[];
    dealers: Record<string, unknown>[];
    businesses: Record<string, unknown>[];
  }>({ people: [], dealers: [], businesses: [] });

  const load = async () => {
    setLoading(true);
    try {
      setData(await fetchCommunityDiscover({ q, city, kind }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPageMeta({
      title: "Discover — MotorCart Community",
      description: "Find people, dealers, and automotive professionals.",
    });
    void load();
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="community-feed-page">
      <header className="community-feed-header border-b border-border/80 bg-card/40">
        <div className="community-feed-header-inner">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Discover</h1>
            <p className="text-sm text-muted-foreground">People, dealers, and automotive businesses</p>
          </div>
        </div>
      </header>
      <div className="community-feed-center px-4 py-6">
        <form
          className="mb-6 grid gap-2 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name" />
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="all">All</option>
            <option value="people">People</option>
            <option value="dealers">Dealers</option>
            <option value="businesses">Businesses</option>
            <option value="creators">Creators</option>
          </select>
          <Button type="submit" className="rounded-xl">
            Search
          </Button>
        </form>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="mb-3 text-sm font-semibold">People</h2>
              {data.people.length === 0 ? (
                <p className="text-sm text-muted-foreground">No people found.</p>
              ) : (
                <div className="space-y-2">
                  {data.people.map((p) => (
                    <Link key={String(p.user_id)} to={`/community/u/${String(p.user_id)}`}>
                      <Card className="rounded-2xl">
                        <CardContent className="flex items-center gap-3 p-4">
                          <SocialAvatar
                            userId={String(p.user_id)}
                            name={String(p.display_name ?? "Member")}
                            src={p.avatar_url != null ? String(p.avatar_url) : null}
                            size="sm"
                          />
                          <div>
                            <p className="font-medium">{String(p.display_name ?? "Member")}</p>
                            <p className="text-xs text-muted-foreground">
                              {String(p.profile_type ?? "")}{" "}
                              {p.location_city ? `· ${String(p.location_city)}` : ""}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>
            <section>
              <h2 className="mb-3 text-sm font-semibold">Dealers</h2>
              {data.dealers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No dealers found.</p>
              ) : (
                <div className="space-y-2">
                  {data.dealers.map((d) => (
                    <Link key={String(d.id)} to={`/community/dealers/${String(d.slug)}`}>
                      <Card className="rounded-2xl">
                        <CardContent className="p-4">
                          <p className="font-medium">{String(d.name)}</p>
                          <p className="text-xs text-muted-foreground">
                            {[d.city, d.state].filter(Boolean).join(", ")}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>
            <section>
              <h2 className="mb-3 text-sm font-semibold">Businesses</h2>
              {data.businesses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No businesses found.</p>
              ) : (
                <div className="space-y-2">
                  {data.businesses.map((b) => (
                    <Link key={String(b.id)} to={`/community/business/${String(b.slug)}`}>
                      <Card className="rounded-2xl">
                        <CardContent className="p-4">
                          <p className="font-medium">{String(b.name)}</p>
                          <p className="text-xs text-muted-foreground">
                            {[b.city, b.state].filter(Boolean).join(", ")}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
