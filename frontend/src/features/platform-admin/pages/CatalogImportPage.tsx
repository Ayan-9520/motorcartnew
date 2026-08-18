import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader2,
  Play,
  Upload,
} from "lucide-react";
import { featureFlags } from "@/config/feature-flags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  CATALOG_IMPORT_ACTIVE_SOURCES,
  CATALOG_IMPORT_SOURCES,
  CatalogImportReportNotReadyError,
  fetchCatalogImportReportApi,
  fetchCatalogImportStatusApi,
  formatCatalogImportDuration,
  isCatalogImportJobActive,
  startCatalogImportApi,
  statusTotalDurationMs,
  type CatalogImportSourceUi,
} from "@/integrations/api/catalog-import";
import { apiErrorMessage } from "@/lib/api/axios";
import { setPageMeta } from "@/utils/seo";
import { SuperAdminShell } from "../components/SuperAdminShell";

const INDIAN_CITIES = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Chandigarh",
  "Kochi",
] as const;

const SOURCE_LABELS: Record<CatalogImportSourceUi, string> = {
  gaadi_bazaar: "GaadiBazaar",
  csv: "CSV",
  excel: "Excel",
  oem_feed: "OEM Feed",
  json_api: "JSON API",
};

export function CatalogImportPage() {
  const enabled = featureFlags.catalogAdmin;

  const [source, setSource] = useState<CatalogImportSourceUi>("gaadi_bazaar");
  const [city, setCity] = useState<string>(INDIAN_CITIES[0]);
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState(1);
  const [jobId, setJobId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    setPageMeta({ title: "Catalog import — Super Admin" });
  }, []);

  const startMutation = useMutation({
    mutationFn: startCatalogImportApi,
    onSuccess: (data) => {
      setJobId(data.jobId);
      toast.success("Import job started (dry-run)");
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error));
    },
  });

  const statusQuery = useQuery({
    queryKey: ["catalog-import-status", jobId],
    queryFn: () => fetchCatalogImportStatusApi(jobId!),
    enabled: Boolean(jobId) && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return isCatalogImportJobActive(status) ? 2000 : false;
    },
    retry: 1,
  });

  const reportQuery = useQuery({
    queryKey: ["catalog-import-report", jobId],
    queryFn: () => fetchCatalogImportReportApi(jobId!),
    enabled: reportOpen && Boolean(jobId) && enabled,
    retry: (failureCount, error) => {
      if (error instanceof CatalogImportReportNotReadyError) return failureCount < 8;
      return failureCount < 1;
    },
    retryDelay: 1500,
  });

  const status = statusQuery.data;
  const isActive = isCatalogImportJobActive(status?.status);
  const sourceActive = CATALOG_IMPORT_ACTIVE_SOURCES.has(source);

  const totalDuration = useMemo(() => {
    if (reportQuery.data?.report.performance.totalDurationMs != null) {
      return formatCatalogImportDuration(reportQuery.data.report.performance.totalDurationMs);
    }
    if (status) {
      const ms = statusTotalDurationMs(status);
      return ms != null ? formatCatalogImportDuration(ms) : "—";
    }
    return "—";
  }, [reportQuery.data, status]);

  const handleStart = () => {
    if (!sourceActive) {
      toast.error(`${SOURCE_LABELS[source]} import is not available yet`);
      return;
    }
    if (!city.trim()) {
      toast.error("Select a city");
      return;
    }
    startMutation.mutate({
      source: "gaadi_bazaar",
      city: city.trim(),
      search: search.trim() || undefined,
      pages,
    });
  };

  const handleViewReport = () => {
    setReportOpen(true);
    if (jobId) void reportQuery.refetch();
  };

  return (
    <SuperAdminShell
      title="Catalog import"
      description="Dry-run vehicle catalog import. No database publish — preview pipeline only."
    >
      {!enabled && (
        <Card className="mb-6 border-dashed border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-foreground">Catalog admin is disabled</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Enable{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">VITE_FEATURE_CATALOG_ADMIN</code>{" "}
                on the frontend and{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">FEATURE_CATALOG_ADMIN</code> on the
                backend to use the import API.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" />
              Import configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="catalog-import-source">Source</Label>
              <select
                id="catalog-import-source"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={source}
                onChange={(e) => setSource(e.target.value as CatalogImportSourceUi)}
                disabled={!enabled || startMutation.isPending}
              >
                {CATALOG_IMPORT_SOURCES.map((value) => (
                  <option key={value} value={value}>
                    {SOURCE_LABELS[value]}
                    {!CATALOG_IMPORT_ACTIVE_SOURCES.has(value) ? " (coming soon)" : ""}
                  </option>
                ))}
              </select>
              {!sourceActive && (
                <p className="text-xs text-muted-foreground">
                  {SOURCE_LABELS[source]} will use the unified import pipeline when Phase 5C+ ships. Only
                  GaadiBazaar is wired to the dry-run API today.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="catalog-import-city">City</Label>
              <select
                id="catalog-import-city"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!enabled || !sourceActive || startMutation.isPending}
              >
                {INDIAN_CITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="catalog-import-search">Search keyword</Label>
              <Input
                id="catalog-import-search"
                placeholder="e.g. maruti, creta, swift"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={!enabled || !sourceActive || startMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="catalog-import-pages">Maximum pages</Label>
              <Input
                id="catalog-import-pages"
                type="number"
                min={1}
                max={50}
                value={pages}
                onChange={(e) => setPages(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                disabled={!enabled || !sourceActive || startMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">Listing pages to scrape (1–50).</p>
            </div>

            <Button
              className="w-full sm:w-auto"
              onClick={handleStart}
              disabled={!enabled || !sourceActive || startMutation.isPending}
            >
              {startMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start import
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job progress</CardTitle>
          </CardHeader>
          <CardContent>
            {!jobId && (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">No import job yet</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Configure source, city, and search — then start a dry-run import to track pipeline progress
                  here.
                </p>
              </div>
            )}

            {jobId && statusQuery.isLoading && !status && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}

            {jobId && statusQuery.error && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Could not load job status</p>
                  <p className="mt-1 text-sm text-muted-foreground">{apiErrorMessage(statusQuery.error)}</p>
                </div>
              </div>
            )}

            {jobId && status && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={status.status === "failed" ? "destructive" : "secondary"}>
                    {status.status}
                  </Badge>
                  <Badge variant="outline">Dry-run</Badge>
                  <span className="text-xs text-muted-foreground truncate max-w-full">{status.jobId}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{status.progress.percentComplete}%</span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={status.progress.percentComplete}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(100, status.progress.percentComplete)}%` }}
                    />
                  </div>
                </div>

                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  <Metric label="Current stage" value={status.currentStage ?? "—"} />
                  <Metric label="Records processed" value={String(status.progress.recordsProcessed)} />
                  <Metric
                    label="Stages"
                    value={`${status.progress.stagesCompleted} / ${status.progress.stagesTotal || "—"}`}
                  />
                  <Metric label="Total duration" value={totalDuration} />
                </dl>

                {isActive && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Polling status every 2s…
                  </p>
                )}

                {status.status === "completed" && (
                  <p className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Import finished — preview only, nothing published.
                  </p>
                )}

                {status.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">Errors ({status.errors.length})</p>
                    <ul className="max-h-40 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-3 text-xs">
                      {status.errors.map((item, index) => (
                        <li key={`${item.code}-${index}`}>
                          <span className="font-mono text-destructive">{item.code}</span>
                          <span className="text-muted-foreground"> · {item.stage}</span>
                          <p className="mt-0.5 text-foreground">{item.message}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={handleViewReport}
                    disabled={!enabled}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View report
                  </Button>
                  {(status.status === "completed" || status.status === "failed") && (
                    <Button className="w-full sm:w-auto" asChild>
                      <Link to={`/dashboard/super-admin/catalog/import/${status.jobId}/preview`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Open preview
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import execution report</DialogTitle>
            <DialogDescription>
              Full dry-run report from GET /api/admin/catalog/import/:jobId/report
            </DialogDescription>
          </DialogHeader>

          {reportQuery.isLoading && (
            <div className="space-y-3 py-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {reportQuery.error instanceof CatalogImportReportNotReadyError && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Report not ready — job is still running…
            </div>
          )}

          {reportQuery.error && !(reportQuery.error instanceof CatalogImportReportNotReadyError) && (
            <p className="text-sm text-destructive">{apiErrorMessage(reportQuery.error)}</p>
          )}

          {reportQuery.data?.report && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Dry-run</Badge>
                <Badge variant="secondary">
                  {formatCatalogImportDuration(reportQuery.data.report.performance.totalDurationMs)}
                </Badge>
              </div>

              <Separator />

              <section>
                <h4 className="mb-2 font-medium">Import summary</h4>
                <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                  <Metric label="Records" value={String(reportQuery.data.report.importSummary.recordCount)} />
                  <Metric
                    label="Normalized"
                    value={String(reportQuery.data.report.importSummary.normalizedCount)}
                  />
                  <Metric
                    label="Duplicates"
                    value={String(reportQuery.data.report.importSummary.duplicateCount)}
                  />
                  <Metric
                    label="Storage (mock)"
                    value={String(reportQuery.data.report.importSummary.storageUploads)}
                  />
                  <Metric
                    label="Preview"
                    value={String(reportQuery.data.report.importSummary.previewCount)}
                  />
                  <Metric
                    label="Published"
                    value={reportQuery.data.report.importSummary.published ? "Yes" : "No"}
                  />
                </dl>
              </section>

              <section>
                <h4 className="mb-2 font-medium">Performance</h4>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <Metric
                    label="Scraper"
                    value={formatCatalogImportDuration(reportQuery.data.report.performance.scraperMs)}
                  />
                  <Metric
                    label="Pipeline"
                    value={formatCatalogImportDuration(
                      reportQuery.data.report.performance.importPipelineMs
                    )}
                  />
                  <Metric
                    label="Records/sec"
                    value={String(reportQuery.data.report.performance.recordsPerSecond)}
                  />
                </dl>
              </section>

              {reportQuery.data.report.errorSummary.totalErrors > 0 && (
                <section>
                  <h4 className="mb-2 font-medium text-destructive">
                    Errors ({reportQuery.data.report.errorSummary.totalErrors})
                  </h4>
                  <ul className="max-h-32 space-y-1 overflow-y-auto rounded border p-2 text-xs">
                    {reportQuery.data.report.errorSummary.items.map((item, index) => (
                      <li key={`${item.code}-report-${index}`}>
                        <span className="font-mono">{item.code}</span>: {item.message}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h4 className="mb-2 font-medium">Stage timings</h4>
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded border p-2 text-xs">
                  {reportQuery.data.report.stages.map((stage) => (
                    <li key={`${stage.stage}-${stage.startedAt}`} className="flex justify-between gap-2">
                      <span className={stage.success ? "" : "text-destructive"}>{stage.label}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatCatalogImportDuration(stage.durationMs)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SuperAdminShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground break-words">{value}</dd>
    </div>
  );
}
