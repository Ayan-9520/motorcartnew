import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GrowthEmptyState } from "@/features/growth-crm/components/GrowthEmptyState";
import { GrowthLoadingState } from "@/features/growth-crm/components/GrowthLoadingState";
import { createLeadForm, fetchLeadForms } from "@/features/growth-crm/services/growth-api.service";
import { useGrowthWorkspaceStore } from "@/features/growth-crm/store/growthWorkspaceStore";

export function GrowthLeadsPage() {
  const workspaceId = useGrowthWorkspaceStore((s) => s.workspaceId);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetchLeadForms();
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
      <h1 className="text-2xl font-bold">Lead forms</h1>

      <Card className="p-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label>Form name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button
          size="sm"
          onClick={() => void createLeadForm({ name }).then(() => { setName(""); return load(); })}
        >
          Create form
        </Button>
      </Card>

      {loading ? (
        <GrowthLoadingState />
      ) : rows.length === 0 ? (
        <GrowthEmptyState title="No lead forms" description="Create a capture form for your campaigns." />
      ) : (
        <ul className="space-y-2">
          {rows.map((f) => (
            <li key={String(f.id)}>
              <Link to={`/dashboard/growth/leads/${f.id}`}>
                <Card className="p-4 hover:border-primary/40 flex justify-between">
                  <div>
                    <p className="font-medium">{String(f.name)}</p>
                    <p className="text-xs text-muted-foreground">/{String(f.slug)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {String((f as { _count?: { events: number } })._count?.events ?? 0)} leads
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
