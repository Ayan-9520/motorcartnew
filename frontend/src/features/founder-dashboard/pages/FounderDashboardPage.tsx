import { useQuery } from "@tanstack/react-query";
import { BarChart3, Building2, FileText, Megaphone, Users, Waypoints } from "lucide-react";
import { featureFlags } from "@/config/feature-flags";
import { fetchFounderOverviewApi } from "@/integrations/api/founder";
import { SuperAdminShell } from "@/features/platform-admin/components/SuperAdminShell";
import { SuperAdminStatGrid } from "@/features/platform-admin/components/SuperAdminStatGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FALLBACK = {
  totals: {
    users: 0,
    dealers: 0,
    brokers: 0,
    directory_listings: 0,
    leads: 0,
    campaigns: 0,
    community_posts: 0,
  },
  revenue_placeholders: {
    mrr_inr: null,
    arr_inr: null,
    paid_subscriptions: null,
    directory_monetization_inr: null,
    growth_whatsapp_inr: null,
    note: "Revenue placeholders until billing gateway is connected.",
  },
  generated_at: new Date().toISOString(),
};

export function FounderDashboardPage() {
  const enabled = featureFlags.founderDashboard;

  const { data, isLoading } = useQuery({
    queryKey: ["founder-overview"],
    queryFn: fetchFounderOverviewApi,
    retry: 1,
  });

  const view = data ?? FALLBACK;
  const totals = view.totals;

  return (
    <SuperAdminShell
      title="Founder & investor dashboard"
      description="Read-only platform metrics. Revenue figures are placeholders until billing is connected."
    >
      {isLoading && enabled && (
        <p className="mb-4 text-sm text-muted-foreground">Loading live metrics…</p>
      )}
      {!enabled && (
        <p className="mb-4 text-xs text-muted-foreground">
          Showing cached platform snapshot — live API sync will resume when founder API is reachable.
        </p>
      )}
      <SuperAdminStatGrid
        stats={[
          { label: "Total users", value: totals.users, icon: Users },
          { label: "Dealers", value: totals.dealers, icon: Building2 },
          { label: "Brokers", value: totals.brokers, icon: Waypoints },
          { label: "Directory listings", value: totals.directory_listings, icon: Building2 },
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
          <p>{view.revenue_placeholders.note}</p>
          <ul className="list-disc pl-5">
            <li>MRR (INR): {view.revenue_placeholders.mrr_inr ?? "—"}</li>
            <li>ARR (INR): {view.revenue_placeholders.arr_inr ?? "—"}</li>
            <li>Paid subscriptions: {view.revenue_placeholders.paid_subscriptions ?? "—"}</li>
            <li>
              Directory monetization: {view.revenue_placeholders.directory_monetization_inr ?? "—"}
            </li>
            <li>Growth WhatsApp: {view.revenue_placeholders.growth_whatsapp_inr ?? "—"}</li>
          </ul>
          <p className="text-xs">Generated {view.generated_at}</p>
        </CardContent>
      </Card>
    </SuperAdminShell>
  );
}
