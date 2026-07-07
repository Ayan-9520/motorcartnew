import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { GrowthEmptyState } from "@/features/growth-crm/components/GrowthEmptyState";
import { GrowthLoadingState } from "@/features/growth-crm/components/GrowthLoadingState";
import {
  fetchLeadPipeline,
  PIPELINE_STAGES,
} from "@/features/growth-crm/services/growth-api.service";
import { useGrowthWorkspaceStore } from "@/features/growth-crm/store/growthWorkspaceStore";
import { featureFlags } from "@/config/feature-flags";

export function GrowthLeadPipelinePage() {
  const workspaceId = useGrowthWorkspaceStore((s) => s.workspaceId);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    if (!workspaceId || !featureFlags.growthLeadPipeline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const params: Record<string, string> = {};
    if (stage) params.stage = stage;
    if (q) params.q = q;
    const res = await fetchLeadPipeline(params);
    if (res.ok) setRows(res.data.data ?? []);
    setLoading(false);
  }, [workspaceId, stage, q]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!featureFlags.growthLeadPipeline) {
    return (
      <GrowthEmptyState
        title="Lead pipeline disabled"
        description="Enable VITE_FEATURE_GROWTH_LEAD_PIPELINE to use the advanced lead engine."
      />
    );
  }

  if (!workspaceId) {
    return (
      <GrowthEmptyState
        title="Select a workspace"
        actionLabel="Workspaces"
        actionTo="/dashboard/growth/workspaces"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Lead pipeline</h1>
        <Link to="/dashboard/growth/leads/analytics" className="text-sm text-primary underline">
          Analytics
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={stage === "" ? "default" : "outline"} onClick={() => setStage("")}>
          All
        </Button>
        {PIPELINE_STAGES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={stage === s ? "default" : "outline"}
            onClick={() => setStage(s)}
          >
            {s.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      <Input placeholder="Search leads…" value={q} onChange={(e) => setQ(e.target.value)} />

      {loading ? (
        <GrowthLoadingState />
      ) : rows.length === 0 ? (
        <GrowthEmptyState title="No leads in pipeline" />
      ) : (
        <ul className="space-y-2">
          {rows.map((lead) => (
            <li key={String(lead.id)}>
              <Link to={`/dashboard/growth/leads/pipeline/${lead.id}`}>
                <Card className="p-4 flex flex-wrap justify-between gap-2 hover:border-primary/40">
                  <div>
                    <p className="font-medium text-sm">
                      {String((lead.lead_fields as Record<string, unknown>)?.name ?? lead.id)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(lead.form as { name?: string })?.name ?? "Form"} ·{" "}
                      {new Date(String(lead.created_at)).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge>{String(lead.pipeline_stage)}</Badge>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
