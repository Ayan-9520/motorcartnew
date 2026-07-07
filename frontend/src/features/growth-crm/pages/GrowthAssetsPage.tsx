import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GrowthEmptyState } from "@/features/growth-crm/components/GrowthEmptyState";
import { GrowthLoadingState } from "@/features/growth-crm/components/GrowthLoadingState";
import {
  deleteGrowthAsset,
  fetchGrowthAssets,
  uploadGrowthAsset,
} from "@/features/growth-crm/services/growth-api.service";
import { useGrowthWorkspaceStore } from "@/features/growth-crm/store/growthWorkspaceStore";
import { getApiBaseUrl } from "@/lib/api/base-url";

export function GrowthAssetsPage() {
  const workspaceId = useGrowthWorkspaceStore((s) => s.workspaceId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState("image");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetchGrowthAssets();
    if (res.ok) setRows(res.data.data ?? []);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadGrowthAsset(file, kind, file.name);
    e.target.value = "";
    await load();
  }

  const base = getApiBaseUrl().replace(/\/$/, "");

  if (!workspaceId) {
    return (
      <GrowthEmptyState
        title="Select a workspace"
        description="Choose a workspace in the sidebar to manage assets."
        actionLabel="Workspaces"
        actionTo="/dashboard/growth/workspaces"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Asset library</h1>
        <div className="flex gap-2 items-center">
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="logo">Logo</option>
          </select>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={onUpload} />
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            Upload
          </Button>
        </div>
      </div>

      {loading ? (
        <GrowthLoadingState />
      ) : rows.length === 0 ? (
        <GrowthEmptyState title="No assets" description="Upload logos, vehicle photos, or videos." />
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {rows.map((a) => {
            const url = String(a.public_url ?? "");
            const src = url.startsWith("http") ? url : `${base}${url}`;
            return (
              <Card key={String(a.id)} className="overflow-hidden">
                {String(a.kind) !== "video" ? (
                  <img src={src} alt="" className="aspect-video object-cover w-full bg-muted" />
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center text-xs">Video</div>
                )}
                <div className="p-2 text-xs flex justify-between gap-2">
                  <span className="truncate">{String(a.name)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-destructive"
                    onClick={() => void deleteGrowthAsset(String(a.id)).then(load)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
