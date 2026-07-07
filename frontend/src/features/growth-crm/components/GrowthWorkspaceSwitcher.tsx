import { useEffect, useState } from "react";
import { fetchGrowthWorkspaces } from "@/features/growth-crm/services/growth-api.service";
import { useGrowthWorkspaceStore } from "@/features/growth-crm/store/growthWorkspaceStore";
import { featureFlags } from "@/config/feature-flags";

export function GrowthWorkspaceSwitcher() {
  const { workspaceId, workspaceName, setWorkspace } = useGrowthWorkspaceStore();
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!featureFlags.growthWorkspaces) return;
    void (async () => {
      const res = await fetchGrowthWorkspaces();
      if (!res.ok) return;
      const list = (res.data.data ?? []).map((w) => ({
        id: String(w.id),
        name: String(w.name ?? "Workspace"),
      }));
      setOptions(list);
      if (!workspaceId && list[0]) setWorkspace(list[0].id, list[0].name);
    })();
  }, [workspaceId, setWorkspace]);

  if (!featureFlags.growthWorkspaces) {
    return (
      <p className="text-xs text-muted-foreground px-2">Enable workspace API flag</p>
    );
  }

  return (
    <div className="px-2 py-2">
      <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        Workspace
      </label>
      <select
        className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
        value={workspaceId ?? ""}
        onChange={(e) => {
          const opt = options.find((o) => o.id === e.target.value);
          setWorkspace(e.target.value || null, opt?.name ?? null);
        }}
      >
        <option value="">Select workspace…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      {workspaceName ? (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{workspaceName}</p>
      ) : null}
    </div>
  );
}
