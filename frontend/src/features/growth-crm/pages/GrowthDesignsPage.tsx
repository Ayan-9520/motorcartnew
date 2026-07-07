import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GrowthEmptyState } from "@/features/growth-crm/components/GrowthEmptyState";
import { GrowthLoadingState } from "@/features/growth-crm/components/GrowthLoadingState";
import { fetchGrowthDesigns } from "@/features/growth-crm/services/growth-api.service";
import { useGrowthWorkspaceStore } from "@/features/growth-crm/store/growthWorkspaceStore";

export function GrowthDesignsPage() {
  const workspaceId = useGrowthWorkspaceStore((s) => s.workspaceId);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetchGrowthDesigns();
    if (res.ok) setRows(res.data.data ?? []);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

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
        <h1 className="text-2xl font-bold">Poster designs</h1>
        <Button asChild size="sm">
          <Link to="/dashboard/growth/designs/new">New design</Link>
        </Button>
      </div>

      {loading ? (
        <GrowthLoadingState />
      ) : rows.length === 0 ? (
        <GrowthEmptyState
          title="No designs"
          description="Create an automotive poster from a template."
          actionLabel="New design"
          actionTo="/dashboard/growth/designs/new"
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((d) => (
            <li key={String(d.id)}>
              <Link to={`/dashboard/growth/designs/${d.id}`}>
                <Card className="p-4 hover:border-primary/40">
                  <p className="font-medium">{String(d.name)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {String(d.format)} · {String(d.status)}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
