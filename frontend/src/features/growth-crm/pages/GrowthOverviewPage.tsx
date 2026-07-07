import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { GrowthLoadingState } from "@/features/growth-crm/components/GrowthLoadingState";
import {
  fetchBroadcasts,
  fetchGrowthDesigns,
  fetchGrowthWorkspaces,
  fetchLeadForms,
  isGrowthApiEnabled,
} from "@/features/growth-crm/services/growth-api.service";
import { useGrowthWorkspaceStore } from "@/features/growth-crm/store/growthWorkspaceStore";

export function GrowthOverviewPage() {
  const workspaceId = useGrowthWorkspaceStore((s) => s.workspaceId);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    workspaces: 0,
    designs: 0,
    forms: 0,
    broadcasts: 0,
  });

  useEffect(() => {
    if (!isGrowthApiEnabled()) {
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      const [ws, designs, forms, broadcasts] = await Promise.all([
        fetchGrowthWorkspaces(),
        workspaceId ? fetchGrowthDesigns() : Promise.resolve({ ok: false as const, error: "", status: 0 }),
        workspaceId ? fetchLeadForms() : Promise.resolve({ ok: false as const, error: "", status: 0 }),
        workspaceId ? fetchBroadcasts() : Promise.resolve({ ok: false as const, error: "", status: 0 }),
      ]);
      setStats({
        workspaces: ws.ok ? ws.data.data?.length ?? 0 : 0,
        designs: designs.ok ? designs.data.data?.length ?? 0 : 0,
        forms: forms.ok ? forms.data.data?.length ?? 0 : 0,
        broadcasts: broadcasts.ok ? broadcasts.data.data?.length ?? 0 : 0,
      });
      setLoading(false);
    })();
  }, [workspaceId]);

  if (loading) return <GrowthLoadingState rows={3} />;

  const cards = [
    { label: "Workspaces", value: stats.workspaces, to: "/dashboard/growth/workspaces" },
    { label: "Designs", value: stats.designs, to: "/dashboard/growth/designs" },
    { label: "Lead forms", value: stats.forms, to: "/dashboard/growth/leads" },
    { label: "Broadcasts", value: stats.broadcasts, to: "/dashboard/growth/whatsapp" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Growth overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Posters, WhatsApp campaigns, and lead capture — isolated from dealer CRM.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="p-4 hover:border-primary/40 transition-colors">
              <p className="text-xs text-muted-foreground uppercase">{c.label}</p>
              <p className="text-3xl font-semibold mt-1">{c.value}</p>
            </Card>
          </Link>
        ))}
      </div>
      {!workspaceId ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Select a workspace in the sidebar to load workspace-scoped metrics.
        </p>
      ) : null}
    </div>
  );
}
