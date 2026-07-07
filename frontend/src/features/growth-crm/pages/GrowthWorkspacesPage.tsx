import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GrowthEmptyState } from "@/features/growth-crm/components/GrowthEmptyState";
import { GrowthLoadingState } from "@/features/growth-crm/components/GrowthLoadingState";
import {
  createGrowthWorkspace,
  fetchGrowthWorkspaces,
} from "@/features/growth-crm/services/growth-api.service";
import { useGrowthWorkspaceStore } from "@/features/growth-crm/store/growthWorkspaceStore";
import { POSTER_TEMPLATES } from "@/features/growth-crm/config/poster-templates";

const BUSINESS_TYPES = [
  { value: "dealer", label: "Dealer" },
  { value: "broker", label: "Broker" },
  { value: "dsa", label: "DSA" },
  { value: "insurance", label: "Insurance" },
  { value: "workshop", label: "Workshop" },
  { value: "parts_seller", label: "Parts seller" },
  { value: "influencer", label: "Influencer" },
];

export function GrowthWorkspacesPage() {
  const setWorkspace = useGrowthWorkspaceStore((s) => s.setWorkspace);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("dealer");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchGrowthWorkspaces();
    if (res.ok) setRows(res.data.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await createGrowthWorkspace({ name, business_type: businessType });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const w = res.data.data;
    setWorkspace(String(w.id), String(w.name));
    setName("");
    await load();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Workspaces</h1>

      <Card className="p-4 space-y-3">
        <h2 className="font-medium text-sm">Create workspace</h2>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="ws-name">Name</Label>
            <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="ws-type">Business type</Label>
            <select
              id="ws-type"
              className="w-full h-10 rounded-md border px-3 text-sm"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="sm:col-span-2">
            Create workspace
          </Button>
        </form>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </Card>

      {loading ? (
        <GrowthLoadingState />
      ) : rows.length === 0 ? (
        <GrowthEmptyState
          title="No workspaces yet"
          description="Create your first Growth workspace to manage assets, posters, and campaigns."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((w) => (
            <li key={String(w.id)}>
              <Card className="p-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{String(w.name)}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(w.business_type)} · {String(w.slug)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setWorkspace(String(w.id), String(w.name))}
                >
                  Use workspace
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        {POSTER_TEMPLATES.length} poster templates available in Designs.
      </p>
    </div>
  );
}
