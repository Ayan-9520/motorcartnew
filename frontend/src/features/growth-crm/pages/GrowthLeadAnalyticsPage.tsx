import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { GrowthEmptyState } from "@/features/growth-crm/components/GrowthEmptyState";
import { GrowthLoadingState } from "@/features/growth-crm/components/GrowthLoadingState";
import { fetchLeadAnalytics } from "@/features/growth-crm/services/growth-api.service";
import { useGrowthWorkspaceStore } from "@/features/growth-crm/store/growthWorkspaceStore";
import { featureFlags } from "@/config/feature-flags";

function StatBlock({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  if (!entries.length) return null;
  return (
    <Card className="p-4">
      <h2 className="font-medium text-sm mb-3">{title}</h2>
      <ul className="space-y-1 text-sm">
        {entries.map(([k, v]) => (
          <li key={k} className="flex justify-between">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium">{v}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function GrowthLeadAnalyticsPage() {
  const workspaceId = useGrowthWorkspaceStore((s) => s.workspaceId);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId || !featureFlags.growthLeadPipeline) {
      setLoading(false);
      return;
    }
    void fetchLeadAnalytics().then((res) => {
      if (res.ok) setData(res.data.data);
      setLoading(false);
    });
  }, [workspaceId]);

  if (!featureFlags.growthLeadPipeline) {
    return <GrowthEmptyState title="Lead analytics disabled" />;
  }

  if (!workspaceId) {
    return <GrowthEmptyState title="Select a workspace" actionTo="/dashboard/growth/workspaces" />;
  }

  if (loading) return <GrowthLoadingState />;

  return (
    <div className="space-y-6">
      <Link to="/dashboard/growth/leads/pipeline" className="text-sm text-primary underline">
        ← Pipeline
      </Link>
      <h1 className="text-2xl font-bold">Lead analytics</h1>
      <p className="text-sm text-muted-foreground">Workspace-scoped · source · campaign · stage</p>

      <Card className="p-4">
        <p className="text-xs text-muted-foreground">Total leads</p>
        <p className="text-3xl font-semibold">{String(data?.total ?? 0)}</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatBlock
          title="By pipeline stage"
          data={(data?.by_pipeline_stage as Record<string, number>) ?? {}}
        />
        <StatBlock title="By source" data={(data?.by_source as Record<string, number>) ?? {}} />
        <StatBlock title="By campaign" data={(data?.by_campaign as Record<string, number>) ?? {}} />
        <StatBlock title="By form" data={(data?.by_form as Record<string, number>) ?? {}} />
      </div>
    </div>
  );
}
