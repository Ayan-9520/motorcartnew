import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileSpreadsheet, Loader2, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/axios";
import { useDealer } from "@/features/dealer-crm/hooks/useDealer";
import { NewCarDealerShell } from "../components/NewCarDealerShell";
import { clearAllNewCarInventory } from "../services/new-car-dealer.service";
import { setPageMeta } from "@/utils/seo";

type PreviewRow = {
  rowNumber: number;
  action: string;
  severity?: string;
  errors: string[];
  warnings?: string[];
};

type PreviewData = {
  batchId: string;
  filename: string;
  mode: string;
  warnings: string[];
  total: number;
  valid: number;
  invalid: number;
  readyToImport?: number;
  readyWithWarnings?: number;
  needCorrection?: number;
  toCreate: number;
  toUpdate: number;
  skipped: number;
  rows: PreviewRow[];
};

/** Dealer NewCarInventory bulk upload — preview → confirm against shared server rules. */
export function NewCarBulkUploadPage() {
  const { dealer, loading } = useDealer();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"create_only" | "create_update">("create_update");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Bulk new car upload" });
  }, []);

  const runPreviewRequest = async (): Promise<PreviewData | null> => {
    if (!file || !dealer) return null;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", mode);
    fd.append("dealer_id", dealer.id);
    const { data } = await api.post<{ data: PreviewData }>("/api/new-car/inventory/bulk/preview", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  };

  const runConfirmRequest = async (batchId: string) => {
    const { data } = await api.post<{ data: Record<string, unknown> }>("/api/new-car/inventory/bulk/confirm", {
      batchId,
    });
    return data.data;
  };

  const onClearAllStock = async () => {
    if (!dealer?.id) return;
    if (!window.confirm("Remove ALL current showroom stock so you can upload a fresh Excel?")) return;
    setBusy(true);
    try {
      const { error } = await clearAllNewCarInventory(dealer.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Stock cleared — upload your Excel now");
      setPreview(null);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const runPreviewOnly = async () => {
    if (!file || !dealer) return;
    setBusy(true);
    setResult(null);
    try {
      const data = await runPreviewRequest();
      setPreview(data);
      if (!data) {
        toast.error("Preview failed");
        return;
      }
      const readyCount = data.valid ?? 0;
      const skipped = data.skipped ?? 0;
      if (readyCount > 0) {
        toast.success(`${readyCount} row(s) ready — click Upload to inventory`);
      } else if (skipped > 0 && (data.needCorrection ?? data.invalid ?? 0) === 0) {
        toast.success(
          `All ${skipped} row(s) already in stock. Open Inventory, or use “Create + update existing”.`,
        );
      } else {
        toast.error(
          "No rows ready — check Brand/Model columns (or name the file like Aston Martin.xlsx).",
        );
      }
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } } };
      toast.error(ax.response?.data?.message ?? "Preview failed");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  /** One-click: validate then import ready rows (bad rows are skipped). */
  const runUpload = async () => {
    if (!file || !dealer) {
      toast.error("Please choose an Excel / CSV file first");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const data = await runPreviewRequest();
      setPreview(data);
      if (!data?.batchId) {
        toast.error("Preview failed");
        return;
      }
      const readyCount = data.valid ?? 0;
      const skipped = data.skipped ?? 0;
      if (readyCount <= 0) {
        if (skipped > 0 && (data.needCorrection ?? data.invalid ?? 0) === 0) {
          toast.success(`Already in stock (${skipped}). Opening inventory…`);
          navigate("/dashboard/new-car/inventory");
          return;
        }
        toast.error("No rows ready to upload — need Brand + Model columns.");
        return;
      }
      const out = await runConfirmRequest(data.batchId);
      setResult(out);
      setPreview(null);
      const failed = Number(out.failed ?? 0);
      toast.success(
        failed > 0
          ? `Uploaded — created ${out.created}, updated ${out.updated}, skipped ${out.skipped}, failed ${out.failed}`
          : `Upload complete — created ${out.created}, updated ${out.updated}, skipped ${out.skipped}`,
      );
      if (Number(out.created ?? 0) + Number(out.updated ?? 0) > 0) {
        navigate("/dashboard/new-car/inventory");
      }
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } } };
      toast.error(ax.response?.data?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const runConfirmOnly = async () => {
    if (!preview?.batchId) return;
    setBusy(true);
    try {
      const out = await runConfirmRequest(preview.batchId);
      setResult(out);
      toast.success(
        `Upload complete — created ${out.created}, updated ${out.updated}, failed ${out.failed}`,
      );
      setPreview(null);
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } } };
      toast.error(ax.response?.data?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-muted-foreground p-6">Loading…</p>;
  if (!dealer) {
    return (
      <NewCarDealerShell title="Bulk upload" description="Complete dealer onboarding to upload stock.">
        <p className="text-sm text-muted-foreground">Dealer profile not found for this account.</p>
      </NewCarDealerShell>
    );
  }

  const ready = preview?.readyToImport ?? Math.max(0, (preview?.valid ?? 0) - (preview?.readyWithWarnings ?? 0));
  const warnReady = preview?.readyWithWarnings ?? 0;
  const needFix = preview?.needCorrection ?? preview?.invalid ?? 0;
  const canConfirm = Boolean(preview && (preview.valid ?? 0) > 0 && !busy);

  return (
    <NewCarDealerShell
      title="Bulk Excel / CSV upload"
      description="Required: Brand + Model only. Other columns optional. Good rows import even if some rows need correction."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            type="button"
            onClick={() => {
              void (async () => {
                try {
                  const res = await api.get<Blob>("/api/new-car/inventory/bulk/template?format=xlsx", {
                    responseType: "blob",
                  });
                  const url = URL.createObjectURL(res.data);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "motorcart-new-car-inventory-demo.xlsx";
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  toast.error("Could not download Excel demo");
                }
              })();
            }}
          >
            <Download className="mr-1 h-4 w-4" /> Demo Excel (ICE + EV)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            type="button"
            onClick={() => {
              void (async () => {
                try {
                  const res = await api.get<Blob>("/api/new-car/inventory/bulk/template?format=csv", {
                    responseType: "blob",
                  });
                  const url = URL.createObjectURL(res.data);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "motorcart-new-car-inventory-demo.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  toast.error("Could not download CSV template");
                }
              })();
            }}
          >
            <Download className="mr-1 h-4 w-4" /> Template CSV
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" disabled={busy} onClick={() => void onClearAllStock()}>
            <Trash2 className="mr-1 h-4 w-4" /> Clear all stock
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link to="/dashboard/new-car/inventory">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to stock
            </Link>
          </Button>
        </div>
      }
    >
      <div className="dealer-os-card mb-4 space-y-2 p-4 text-sm">
        <p className="font-semibold text-foreground">How to upload</p>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Download the Demo Excel (or use your own sheet)</li>
          <li>Choose the file below</li>
          <li>
            Click <span className="font-medium text-foreground">Upload to inventory</span> — we validate and
            import ready rows in one step
          </li>
        </ol>
        <p className="pt-1 text-muted-foreground">
          <span className="font-medium text-foreground">Required:</span> Brand (or Make) · Model. All other
          columns are optional — leave blank if missing. If one row has an issue, good rows still upload.
        </p>
        <p className="text-muted-foreground">
          Tip: name the file like <span className="font-medium text-foreground">Aston Martin.xlsx</span> if the
          sheet only has a Model column. Title rows above headers are auto-skipped.
        </p>
      </div>

      <div className="dealer-os-card space-y-4 p-4">
        <label className="block text-sm font-medium">
          1. Choose file (.csv / .xlsx)
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="mt-2 block w-full text-sm"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setResult(null);
            }}
          />
        </label>
        {file ? (
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground">
            Selected: <span className="font-medium">{file.name}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Select a file to enable Upload.</p>
        )}
        <label className="block text-sm font-medium">
          Import mode
          <select
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as "create_only" | "create_update")}
          >
            <option value="create_update">Create + update existing (recommended)</option>
            <option value="create_only">Create only (duplicates skipped)</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-xl shadow-[var(--shadow-primary)]" disabled={!file || busy} onClick={() => void runUpload()}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
            Upload to inventory
          </Button>
          <Button variant="outline" className="rounded-xl" disabled={!file || busy} onClick={() => void runPreviewOnly()}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-1 h-4 w-4" />}
            Check file only
          </Button>
          {preview && (preview.valid ?? 0) > 0 ? (
            <Button className="rounded-xl" variant="secondary" disabled={!canConfirm} onClick={() => void runConfirmOnly()}>
              Upload ready rows ({preview.valid})
            </Button>
          ) : null}
        </div>
      </div>

      {preview ? (
        <div className="dealer-os-card mt-4 space-y-3 p-4 text-sm">
          <p className="font-semibold">
            Preview — {preview.filename} · mode {preview.mode}
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-400">
              {ready} Ready to Import
            </span>
            <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-400">
              {warnReady} Ready with Warnings
            </span>
            <span className="rounded-lg bg-destructive/10 px-2.5 py-1 font-medium text-destructive">
              {needFix} Need Correction
            </span>
          </div>
          <p className="text-muted-foreground">
            Total {preview.total} · Create {preview.toCreate} · Update {preview.toUpdate} · Skip {preview.skipped}
          </p>
          {(preview.valid ?? 0) > 0 ? (
            <Button className="rounded-xl" disabled={busy} onClick={() => void runConfirmOnly()}>
              <Upload className="mr-1 h-4 w-4" />
              Upload {preview.valid} ready row(s) now
            </Button>
          ) : null}
          {preview.warnings?.length ? (
            <ul className="list-disc pl-5 text-muted-foreground">
              {preview.warnings.slice(0, 8).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          <ul className="max-h-72 space-y-2 overflow-auto border-t pt-2">
            {preview.rows
              .filter(
                (r) =>
                  r.action === "error" ||
                  r.action === "skip" ||
                  (r.warnings && r.warnings.length > 0),
              )
              .slice(0, 50)
              .map((r) => (
                <li
                  key={`${r.rowNumber}-${r.action}`}
                  className={
                    r.action === "error"
                      ? "text-destructive"
                      : r.action === "skip"
                        ? "text-muted-foreground"
                        : "text-amber-700 dark:text-amber-400"
                  }
                >
                  <span className="font-medium">Row {r.rowNumber}</span>
                  {r.action === "error" ? (
                    <span>: {r.errors.join("; ")}</span>
                  ) : r.action === "skip" ? (
                    <span>: Already in stock (duplicate) — {r.warnings?.[0] ?? "skipped"}</span>
                  ) : (
                    <span>: {r.warnings?.join("; ")}</span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {result ? (
        <div className="dealer-os-card mt-4 space-y-2 p-4 text-sm">
          <p className="font-semibold">UPLOAD COMPLETE</p>
          <p>
            Total {String(result.total)} · Created {String(result.created)} · Updated {String(result.updated)} ·
            Skipped {String(result.skipped)} · Failed {String(result.failed)}
          </p>
          <Button className="rounded-xl" onClick={() => navigate("/dashboard/new-car/inventory")}>
            Open inventory
          </Button>
        </div>
      ) : null}
    </NewCarDealerShell>
  );
}
