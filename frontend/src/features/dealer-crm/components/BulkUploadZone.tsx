import { useCallback, useRef, useState } from "react";
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, RotateCcw, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadSampleTemplate } from "../lib/excel-parser";
import { useBulkUpload } from "../hooks/useBulkUpload";
import type { DealerProfile } from "../types";

interface BulkUploadZoneProps {
  dealer: DealerProfile | null;
  sellerId?: string;
  onComplete?: () => void;
}

export function BulkUploadZone({ dealer, sellerId, onComplete }: BulkUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { state, parseFile, uploadRows, retryFailed, reset } = useBulkUpload(dealer, sellerId);

  const handleFile = useCallback(
    async (file: File) => {
      await parseFile(file);
    },
    [parseFile]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const startUpload = async () => {
    await uploadRows();
    onComplete?.();
  };

  const validCount = state.total;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Bulk Excel / CSV Upload
        </CardTitle>
        <CardDescription>
          Required: Brand · Model. Same Excel for petrol/diesel and EV (Range Km + Battery kWh). Download demo sample
          and upload as-is. Images: https URLs in Excel; PNG/JPG/AVIF via Edit after upload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={downloadSampleTemplate}>
          <Download className="h-4 w-4" />
          Download demo Excel (ICE + EV)
        </Button>

        <section
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"
          )}
        >
          <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">Drop Excel (.xlsx) or CSV here</p>
          <Button type="button" variant="default" size="sm" className="mt-4" onClick={() => inputRef.current?.click()}>
            Browse files
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </section>

        {state.warnings.length > 0 && (
          <aside className="max-h-32 overflow-y-auto rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Warnings ({state.warnings.length}) — rows still uploadable
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {state.warnings.slice(0, 15).map((err, i) => (
                <li key={`w-${i}`}>
                  Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
          </aside>
        )}

        {state.errors.length > 0 && (
          <aside className="max-h-40 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4" />
              Need correction ({state.errors.length})
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {state.errors.slice(0, 25).map((err, i) => (
                <li key={`e-${i}`}>
                  Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
          </aside>
        )}

        {state.total > 0 && state.status !== "uploading" && state.status !== "done" && (
          <footer className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground mr-auto">{validCount} ready to upload</p>
            <Button variant="default" onClick={startUpload} disabled={!dealer || validCount <= 0}>
              Upload {validCount} valid rows
            </Button>
            <Button variant="ghost" onClick={reset}>
              Reset
            </Button>
          </footer>
        )}

        {state.status === "uploading" && (
          <article className="space-y-2">
            <p className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{state.progress}%</span>
            </p>
            <span className="block h-2 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full bg-primary text-primary-foreground transition-all duration-300"
                style={{ width: `${state.progress}%` }}
              />
            </span>
          </article>
        )}

        {state.status === "done" && (
          <aside className="space-y-3 rounded-lg border border-primary/30 bg-accent/30 p-4">
            <p className="flex items-center gap-2 font-medium text-primary">
              <CheckCircle2 className="h-5 w-5" />
              Upload complete
            </p>
            <p className="text-sm">
              <strong className="text-primary">{state.success}</strong> succeeded ·{" "}
              <strong className="text-destructive">{state.failed}</strong> failed
            </p>
            {state.failed > 0 && (
              <Button variant="outline" size="sm" className="gap-1" onClick={retryFailed}>
                <RotateCcw className="h-4 w-4" />
                Retry failed rows
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={reset}>
              Upload another file
            </Button>
          </aside>
        )}
      </CardContent>
    </Card>
  );
}
