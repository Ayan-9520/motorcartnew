import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { GrowthLoadingState } from "@/features/growth-crm/components/GrowthLoadingState";
import {
  DEFAULT_POSTER_DATA,
  getPosterTemplate,
  POSTER_TEMPLATES,
  type PosterCanvasData,
} from "@/features/growth-crm/config/poster-templates";
import {
  canvasToPngBlob,
  renderPosterToCanvas,
} from "@/features/growth-crm/lib/poster-canvas";
import {
  createGrowthDesign,
  exportGrowthDesign,
  fetchGrowthAssets,
  fetchGrowthDesign,
  updateGrowthDesign,
  uploadGrowthAsset,
} from "@/features/growth-crm/services/growth-api.service";
import { useGrowthWorkspaceStore } from "@/features/growth-crm/store/growthWorkspaceStore";
import { getApiBaseUrl } from "@/lib/api/base-url";

function parseCanvasJson(raw: unknown): PosterCanvasData {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...DEFAULT_POSTER_DATA, ...(raw as PosterCanvasData) };
  }
  return { ...DEFAULT_POSTER_DATA };
}

export function GrowthDesignEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new" || !id;
  const navigate = useNavigate();
  const workspaceId = useGrowthWorkspaceStore((s) => s.workspaceId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [designId, setDesignId] = useState<string | null>(isNew ? null : id ?? null);
  const [name, setName] = useState("Untitled poster");
  const [data, setData] = useState<PosterCanvasData>({ ...DEFAULT_POSTER_DATA });
  const [assets, setAssets] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const template = getPosterTemplate(data.templateId) ?? POSTER_TEMPLATES[0];

  const renderPreview = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    await renderPosterToCanvas(canvas, template, data);
  }, [template, data]);

  useEffect(() => {
    void renderPreview();
  }, [renderPreview]);

  useEffect(() => {
    if (!workspaceId) return;
    void fetchGrowthAssets().then((res) => {
      if (res.ok) setAssets(res.data.data ?? []);
    });
  }, [workspaceId]);

  useEffect(() => {
    if (isNew || !id) return;
    void (async () => {
      setLoading(true);
      const res = await fetchGrowthDesign(id);
      if (res.ok) {
        const d = res.data.data;
        setDesignId(String(d.id));
        setName(String(d.name));
        setData(parseCanvasJson(d.canvas_json));
      }
      setLoading(false);
    })();
  }, [id, isNew]);

  function assetUrl(path: string) {
    return path.startsWith("http") ? path : `${getApiBaseUrl()}${path}`;
  }

  async function handleSave() {
    if (!workspaceId) return;
    setSaving(true);
    setMessage(null);
    const body = {
      name,
      format: template.format,
      canvas_json: data,
      width: template.width,
      height: template.height,
    };
    const res = designId
      ? await updateGrowthDesign(designId, body)
      : await createGrowthDesign(body);
    setSaving(false);
    if (!res.ok) {
      setMessage(res.error);
      return;
    }
    const newId = String(res.data.data.id);
    setDesignId(newId);
    setMessage("Saved");
    if (isNew) navigate(`/dashboard/growth/designs/${newId}`, { replace: true });
  }

  async function handleExportPng() {
    if (!designId || !workspaceId) {
      setMessage("Save the design first");
      return;
    }
    setExporting(true);
    const canvas = canvasRef.current;
    if (!canvas) {
      setExporting(false);
      return;
    }
    await renderPosterToCanvas(canvas, template, data);
    const blob = await canvasToPngBlob(canvas);
    if (!blob) {
      setMessage("Export failed");
      setExporting(false);
      return;
    }
    const file = new File([blob], `${name.replace(/\s+/g, "-")}.png`, { type: "image/png" });
    const up = await uploadGrowthAsset(file, "image", `${name} export`);
    const publicUrl = up.ok ? String(up.data.data.public_url) : `/uploads/growth/${workspaceId}/exports/stub.png`;
    const ex = await exportGrowthDesign(designId, {
      public_url: publicUrl,
      width: template.width,
      height: template.height,
      size_bytes: blob.size,
    });
    setExporting(false);
    setMessage(ex.ok ? "Exported PNG" : ex.error);
  }

  if (!workspaceId) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link to="/dashboard/growth/workspaces" className="text-primary underline">
          Select a workspace
        </Link>{" "}
        first.
      </p>
    );
  }

  if (loading) return <GrowthLoadingState rows={6} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/dashboard/growth/designs" className="text-sm text-muted-foreground hover:text-foreground">
          ← Designs
        </Link>
        <h1 className="text-2xl font-bold flex-1">Poster builder</h1>
        <Button variant="outline" size="sm" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" onClick={() => void handleExportPng()} disabled={exporting}>
          {exporting ? "Exporting…" : "Export PNG"}
        </Button>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <Label>Design name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Template</Label>
            <select
              className="w-full h-10 rounded-md border px-3 text-sm"
              value={data.templateId}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  templateId: e.target.value as PosterCanvasData["templateId"],
                }))
              }
            >
              {POSTER_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Logo (from assets)</Label>
            <select
              className="w-full h-10 rounded-md border px-3 text-sm"
              value={data.logoUrl ?? ""}
              onChange={(e) => setData((d) => ({ ...d, logoUrl: e.target.value || null }))}
            >
              <option value="">None</option>
              {assets
                .filter((a) => a.kind === "logo" || a.kind === "image")
                .map((a) => (
                  <option key={String(a.id)} value={assetUrl(String(a.public_url))}>
                    {String(a.name)}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Label>Vehicle image</Label>
            <select
              className="w-full h-10 rounded-md border px-3 text-sm"
              value={data.vehicleImageUrl ?? ""}
              onChange={(e) => setData((d) => ({ ...d, vehicleImageUrl: e.target.value || null }))}
            >
              <option value="">None</option>
              {assets
                .filter((a) => a.kind === "image")
                .map((a) => (
                  <option key={String(a.id)} value={assetUrl(String(a.public_url))}>
                    {String(a.name)}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Label>Offer title</Label>
            <Input
              value={data.offerTitle}
              onChange={(e) => setData((d) => ({ ...d, offerTitle: e.target.value }))}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={data.offerDescription}
              onChange={(e) => setData((d) => ({ ...d, offerDescription: e.target.value }))}
              rows={3}
            />
          </div>
          <div>
            <Label>Price</Label>
            <Input value={data.price} onChange={(e) => setData((d) => ({ ...d, price: e.target.value }))} />
          </div>
          <div>
            <Label>CTA</Label>
            <Input value={data.cta} onChange={(e) => setData((d) => ({ ...d, cta: e.target.value }))} />
          </div>
        </Card>

        <Card className="p-4 flex flex-col items-center">
          <p className="text-xs text-muted-foreground mb-3">Preview</p>
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto border rounded-lg shadow-sm"
            style={{ maxHeight: "70vh" }}
          />
        </Card>
      </div>
    </div>
  );
}
