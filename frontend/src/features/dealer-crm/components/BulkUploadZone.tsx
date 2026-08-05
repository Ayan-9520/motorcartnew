import { useCallback, useRef, useState } from "react";
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
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

  const validCount = state.total - state.errors.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Bulk Excel / CSV Upload
        </CardTitle>
        <CardDescription>Drag and drop or browse. Validates rows and inserts into your showroom + marketplace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={downloadSampleTemplate}>
          <Download className="h-4 w-4" />
          Download sample Excel template
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

        {state.errors.length > 0 && (
          <aside className="max-h-40 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4" />
              Validation errors ({state.errors.length})
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {state.errors.slice(0, 25).map((err, i) => (
                <li key={i}>
                  Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
          </aside>
        )}

        {state.total > 0 && state.status !== "uploading" && (
          <footer className="flex gap-2">
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
          </aside>
        )}
      </CardContent>
    </Card>
  );
}
