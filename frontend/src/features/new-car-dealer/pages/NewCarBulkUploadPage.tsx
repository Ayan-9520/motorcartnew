import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/axios";
import { useDealer } from "@/features/dealer-crm/hooks/useDealer";
import { NewCarDealerShell } from "../components/NewCarDealerShell";
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
  const [mode, setMode] = useState<"create_only" | "create_update">("create_only");
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
      if (readyCount > 0) {
        toast.success(`${readyCount} row(s) ready — click Upload to inventory`);
      } else {
        toast.error("No rows ready — fix errors and try again");
      }
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } } };
      toast.error(ax.response?.data?.message ?? "Preview failed");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  /** One-click: validate then import — what dealers expect as “Upload”. */
  const runUpload = async () => {
    if (!file || !dealer) {
      toast.error("Pehle Excel / CSV file choose karo");
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
      if (readyCount <= 0) {
        toast.error("Koi row upload ke liye ready nahi — errors check karo");
        return;
      }
      const out = await runConfirmRequest(data.batchId);
      setResult(out);
      setPreview(null);
      toast.success(
        `Upload complete — created ${out.created}, updated ${out.updated}, failed ${out.failed}`,
      );
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
      description="Required: Brand + Model. ICE: Engine CC + Mileage. EV: Fuel=Electric, Range Km + Battery kWh. Download the demo Excel (petrol + EV rows) and upload as-is."
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
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link to="/dashboard/new-car/inventory">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to stock
            </Link>
          </Button>
        </div>
      }
    >
      <div className="dealer-os-card mb-4 space-y-2 p-4 text-sm">
        <p className="font-semibold text-foreground">Kaise upload karein</p>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Demo Excel download karo (ya apni sheet)</li>
          <li>Neeche file choose karo</li>
          <li>
            Green <span className="font-medium text-foreground">Upload to inventory</span> dabao — check + import
            ek saath
          </li>
        </ol>
        <p className="pt-1 text-muted-foreground">
          <span className="font-medium text-foreground">Required:</span> Brand · Model ·{" "}
          <span className="font-medium text-foreground">EV:</span> Fuel=Electric, Range Km, Battery kWh
        </p>
      </div>

      <div className="dealer-os-card space-y-4 p-4">
        <label className="block text-sm font-medium">
          1. File choose karo (.csv / .xlsx)
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
          <p className="text-sm text-muted-foreground">File select karne ke baad Upload button active hoga.</p>
        )}
        <label className="block text-sm font-medium">
          Import mode
          <select
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as "create_only" | "create_update")}
          >
            <option value="create_only">Create only (duplicates skipped)</option>
            <option value="create_update">Create + update existing</option>
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
              .filter((r) => r.action === "error" || (r.warnings && r.warnings.length > 0))
              .slice(0, 50)
              .map((r) => (
                <li
                  key={`${r.rowNumber}-${r.action}`}
                  className={r.action === "error" ? "text-destructive" : "text-amber-700 dark:text-amber-400"}
                >
                  <span className="font-medium">Row {r.rowNumber}</span>
                  {r.action === "error" ? (
                    <span>
                      : {r.errors.join("; ")}
                      {/pin/i.test(r.errors.join(" ")) ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Suggested: enter a 6-digit PIN or leave blank.
                        </span>
                      ) : null}
                    </span>
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
