import { useQuery } from "@tanstack/react-query";
import { DIRECTORY_CATEGORIES } from "@/features/business-directory/services/directory-api.service";
import {
  fetchFeaturedBusinesses,
  fetchMonetizationConfig,
  fetchPremiumListings,
  fetchSponsoredBusinesses,
} from "@/features/business-directory/services/directory-api.service";
import { featureFlags } from "@/config/feature-flags";
import { SuperAdminShell } from "../components/SuperAdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DirectoryMonetizationPage() {
  const enabled =
    featureFlags.businessDirectoryV2 && featureFlags.directoryMonetizationK1;

  const configQ = useQuery({
    queryKey: ["k1-config"],
    queryFn: fetchMonetizationConfig,
    enabled,
  });

  if (!enabled) {
    return (
      <SuperAdminShell
        title="Directory monetization (K1)"
        description="Enable directory + K1 feature flags on API and frontend."
      >
        <p className="text-sm text-muted-foreground">K1 monetization layer is disabled.</p>
      </SuperAdminShell>
    );
  }

  return (
    <SuperAdminShell
      title="Directory monetization (K1)"
      description="Featured, sponsored, premium, and verified badges — metadata only, no payment gateway."
    >
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Config</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(configQ.data?.ok ? configQ.data.data.data : configQ.data, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <p className="mb-2 text-sm font-medium">Featured categories</p>
      <div className="grid gap-3 md:grid-cols-2">
        {DIRECTORY_CATEGORIES.map((c) => (
          <CategoryFeaturedCard key={c.slug} slug={c.slug} label={c.label} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ListCard title="Sponsored (sample)" query={fetchSponsoredBusinesses} />
        <ListCard title="Premium (sample)" query={fetchPremiumListings} />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Admin PATCH: PATCH /api/directory/monetization/business/:id (platform admin)
      </p>
    </SuperAdminShell>
  );
}

function CategoryFeaturedCard({ slug, label }: { slug: string; label: string }) {
  const q = useQuery({
    queryKey: ["k1-featured", slug],
    queryFn: () => fetchFeaturedBusinesses(slug, 5),
  });
  const count = q.data?.ok ? q.data.data.data?.length ?? 0 : 0;
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{count} featured</CardContent>
    </Card>
  );
}

function ListCard({
  title,
  query,
}: {
  title: string;
  query: (n?: number) => ReturnType<typeof fetchSponsoredBusinesses>;
}) {
  const q = useQuery({ queryKey: [title], queryFn: () => query(8) });
  const items = q.data?.ok ? q.data.data.data : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-sm space-y-1">
          {(items ?? []).slice(0, 8).map((b) => (
            <li key={String((b as { id?: string }).id)}>{String((b as { name?: string }).name)}</li>
          ))}
          {!items?.length && <li className="text-muted-foreground">None yet</li>}
        </ul>
      </CardContent>
    </Card>
  );
}
