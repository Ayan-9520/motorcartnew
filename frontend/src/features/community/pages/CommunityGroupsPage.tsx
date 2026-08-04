import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { setPageMeta } from "@/utils/seo";
import { fetchCommunityGroups } from "../services/community.service";
import type { CommunityGroup } from "../types";

export function CommunityGroupsPage() {
  const [groups, setGroups] = useState<CommunityGroup[]>([]);

  useEffect(() => {
    setPageMeta({
      title: "Community groups — Motorcart",
      description: "Auto groups by city, vehicle topic, trending hub and dealer rooms.",
    });
    void fetchCommunityGroups().then(setGroups);
  }, []);

  return (
    <div className="community-premium-page pb-24 lg:pb-10">
      <section className="community-premium-hero community-premium-hero--premium community-groups-hero">
        <div className="community-premium-hero-mesh" aria-hidden />
        <div className="container relative py-8 md:py-10">
          <Link to="/community" className="text-sm font-medium text-primary hover:underline">
            ← Back to feed
          </Link>
          <h1 className="community-premium-title mt-4 flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Community groups
          </h1>
          <p className="community-premium-lead">
            Auto groups by city, vehicle topic, trending hub &amp; dealer rooms — join and post with
            like-minded owners.
          </p>
        </div>
      </section>

      <div className="container py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link key={g.id} to={`/community/groups/${g.slug}`}>
              <Card className="community-premium-panel h-full transition-all hover:border-primary/40 hover:shadow-[var(--shadow-card)]">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.groupType.replace("_", " ")}
                  </p>
                  <h2 className="mt-1 text-lg font-bold">{g.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{g.description}</p>
                  <p className="mt-3 text-xs font-medium text-primary">
                    {g.memberCount.toLocaleString()} members
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
