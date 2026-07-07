import { useQuery } from "@tanstack/react-query";
import { BarChart3, Building2, FileText, Megaphone, Users, Waypoints } from "lucide-react";
import { featureFlags } from "@/config/feature-flags";
import { fetchFounderOverviewApi } from "@/integrations/api/founder";
import { SuperAdminShell } from "@/features/platform-admin/components/SuperAdminShell";
import { SuperAdminStatGrid } from "@/features/platform-admin/components/SuperAdminStatGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FounderDashboardPage() {
  const enabled = featureFlags.founderDashboard;

  const { data, isLoading, error } = useQuery({
    queryKey: ["founder-overview"],
    queryFn: fetchFounderOverviewApi,
    enabled,
  });

  if (!enabled) {
    return (
      <SuperAdminShell
        title="Founder dashboard"
        description="Enable VITE_FEATURE_M0_FOUNDER_DASHBOARD and FEATURE_M0_FOUNDER_DASHBOARD on the API."
      >
        <p className="text-sm text-muted-foreground">This dashboard is disabled.</p>
      </SuperAdminShell>
    );
  }

  const totals = data?.totals;

  return (
    <SuperAdminShell
      title="Founder & investor dashboard"
      description="Read-only platform metrics. Revenue figures are placeholders until billing is connected."
    >
      {isLoading && <p className="text-sm text-muted-foreground">Loading metrics…</p>}
      {error && (
        <p className="text-sm text-destructive">Could not load metrics. Sign in as platform admin.</p>
      )}
      {totals && (
        <>
          <SuperAdminStatGrid
            stats={[
              { label: "Total users", value: totals.users, icon: Users },
              { label: "Dealers", value: totals.dealers, icon: Building2 },
              { label: "Brokers", value: totals.brokers, icon: Waypoints },
              {
                label: "Directory listings",
                value: totals.directory_listings,
                icon: Building2,
              },
              { label: "Growth leads", value: totals.leads, icon: FileText },
              { label: "Campaigns (broadcasts)", value: totals.campaigns, icon: Megaphone },
              { label: "Community posts", value: totals.community_posts, icon: BarChart3 },
            ]}
          />
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Revenue placeholders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{data?.revenue_placeholders.note}</p>
              <ul className="list-disc pl-5">
                <li>MRR (INR): {data?.revenue_placeholders.mrr_inr ?? "—"}</li>
                <li>ARR (INR): {data?.revenue_placeholders.arr_inr ?? "—"}</li>
                <li>Paid subscriptions: {data?.revenue_placeholders.paid_subscriptions ?? "—"}</li>
                <li>
                  Directory monetization:{" "}
                  {data?.revenue_placeholders.directory_monetization_inr ?? "—"}
                </li>
                <li>
                  Growth WhatsApp: {data?.revenue_placeholders.growth_whatsapp_inr ?? "—"}
                </li>
              </ul>
              <p className="text-xs">Generated {data?.generated_at}</p>
            </CardContent>
          </Card>
        </>
      )}
    </SuperAdminShell>
  );
}
