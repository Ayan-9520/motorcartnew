import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowLeft,
  Car,
  CheckSquare,
  Eye,
  Loader2,
  Search,
  Square,
  ThumbsDown,
  ThumbsUp,
  UploadCloud,
} from "lucide-react";
import { featureFlags } from "@/config/feature-flags";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CatalogImportReportNotReadyError,
  approveCatalogImportRecordsApi,
  fetchCatalogImportReportApi,
  publishCatalogImportApi,
  rejectCatalogImportRecordsApi,
  type CatalogImportApprovalStatus,
  type CatalogImportPreviewRecord,
  type CatalogImportPreviewStatus,
  type CatalogPublishReport,
} from "@/integrations/api/catalog-import";
import { apiErrorMessage } from "@/lib/api/axios";
import { setPageMeta } from "@/utils/seo";
import { SuperAdminShell } from "../components/SuperAdminShell";

const STATUS_LABELS: Record<CatalogImportPreviewStatus, string> = {
  valid: "Valid",
  duplicate: "Duplicate",
  need_review: "Need review",
  rejected: "Rejected",
};

const APPROVAL_LABELS: Record<CatalogImportApprovalStatus, string> = {
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const CONFIDENCE_FILTERS = [
  { value: "all", label: "All confidence" },
  { value: "high", label: "High (≥ 80)" },
  { value: "mid", label: "Review (1–79)" },
  { value: "low", label: "Low / none (0)" },
  { value: "na", label: "Not matched" },
] as const;

type ConfidenceFilter = (typeof CONFIDENCE_FILTERS)[number]["value"];

function matchesConfidence(record: CatalogImportPreviewRecord, filter: ConfidenceFilter): boolean {
  if (filter === "all") return true;
  if (filter === "na") return record.matchConfidence === null;
  if (record.matchConfidence === null) return false;
  if (filter === "high") return record.matchConfidence >= 80;
  if (filter === "mid") return record.matchConfidence > 0 && record.matchConfidence < 80;
  return record.matchConfidence === 0;
}

function formatPrice(price: string | null): string {
  if (!price) return "—";
  const n = Number(price);
  if (!Number.isFinite(n)) return price;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function statusBadgeVariant(
  status: CatalogImportPreviewStatus
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "rejected") return "destructive";
  if (status === "duplicate") return "secondary";
  if (status === "need_review") return "outline";
  return "default";
}

export function CatalogImportPreviewPage() {
  const enabled = featureFlags.catalogAdmin;
  const queryClient = useQueryClient();
  const { jobId: routeJobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const jobId = routeJobId || searchParams.get("jobId") || "";

  const [tab, setTab] = useState<CatalogImportPreviewStatus | "all">("valid");
  const [brandFilter, setBrandFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CatalogImportPreviewStatus>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [overrideBlocked, setOverrideBlocked] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishReport, setPublishReport] = useState<CatalogPublishReport | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Catalog import preview — Super Admin" });
  }, []);

  const reportQuery = useQuery({
    queryKey: ["catalog-import-preview", jobId],
    queryFn: () => fetchCatalogImportReportApi(jobId),
    enabled: Boolean(jobId) && enabled,
    retry: (failureCount, error) => {
      if (error instanceof CatalogImportReportNotReadyError) return failureCount < 10;
      return failureCount < 1;
    },
    retryDelay: 1500,
  });

  const preview = reportQuery.data?.preview ?? null;
  const records = preview?.records ?? [];

  const approvalMutation = useMutation({
    mutationFn: async () => {
      if (!jobId || !confirmAction) throw new Error("Missing action");
      const recordIds = [...selected];
      if (confirmAction === "approve") {
        return approveCatalogImportRecordsApi(jobId, {
          recordIds,
          override: overrideBlocked || undefined,
        });
      }
      return rejectCatalogImportRecordsApi(jobId, {
        recordIds,
        reason: rejectReason.trim(),
      });
    },
    onSuccess: (result) => {
      toast.success(
        `${result.action === "approve" ? "Approved" : "Rejected"} ${result.applied}/${result.requested} (dry-run)`
      );
      if (result.blocked > 0) {
        toast.error(`${result.blocked} blocked by policy`);
      }
      setSelected(new Set());
      setConfirmAction(null);
      setRejectReason("");
      setOverrideBlocked(false);
      void queryClient.invalidateQueries({ queryKey: ["catalog-import-preview", jobId] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error("Missing job");
      const approvedIds = records
        .filter((r) => (r.approvalStatus ?? "PENDING_REVIEW") === "APPROVED")
        .map((r) => r.id);
      return publishCatalogImportApi(jobId, {
        confirm: true,
        recordIds: approvedIds.length ? approvedIds : undefined,
      });
    },
    onSuccess: (report) => {
      setPublishReport(report);
      setPublishConfirmOpen(false);
      toast.success(
        `Published ${report.summary.published} · failed ${report.summary.failed} · skipped ${report.summary.skippedDuplicate}`
      );
      void queryClient.invalidateQueries({ queryKey: ["catalog-import-preview", jobId] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const approvedCount = records.filter((r) => r.approvalStatus === "APPROVED").length;

  const brands = useMemo(
    () =>
      [...new Set(records.map((r) => r.brand).filter((b) => b && b !== "—"))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [records]
  );

  const cities = useMemo(
    () =>
      [...new Set(records.map((r) => r.city).filter((c) => c && c !== "—"))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [records]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      if (tab !== "all" && record.status !== tab) return false;
      if (statusFilter !== "all" && record.status !== statusFilter) return false;
      if (brandFilter !== "all" && record.brand !== brandFilter) return false;
      if (cityFilter !== "all" && record.city !== cityFilter) return false;
      if (!matchesConfidence(record, confidenceFilter)) return false;
      if (!q) return true;
      const haystack = [
        record.brand,
        record.model,
        record.variant,
        record.fuel,
        record.transmission,
        record.city,
        record.duplicateReason ?? "",
        ...record.validationErrors,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [records, tab, statusFilter, brandFilter, cityFilter, confidenceFilter, query]);

  const selectedVisibleCount = filtered.filter((r) => selected.has(r.id)).length;
  const allVisibleSelected = filtered.length > 0 && selectedVisibleCount === filtered.length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const record of filtered) next.delete(record.id);
      } else {
        for (const record of filtered) next.add(record.id);
      }
      return next;
    });
  };

  return (
    <SuperAdminShell
      title="Import preview & review"
      description="Read-only dry-run preview. No database writes, publish, or approval actions."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/super-admin/catalog/import">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to import
          </Link>
        </Button>
      }
    >
      {!enabled && (
        <Card className="mb-6 border-dashed border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">Catalog admin is disabled</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Enable <code className="rounded bg-muted px-1 text-xs">VITE_FEATURE_CATALOG_ADMIN</code> and
                backend <code className="rounded bg-muted px-1 text-xs">FEATURE_CATALOG_ADMIN</code>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!jobId && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Eye className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">No import job selected</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Start a dry-run import, then open preview from the job progress panel.
            </p>
            <Button asChild>
              <Link to="/dashboard/super-admin/catalog/import">Go to Catalog Import</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {jobId && enabled && reportQuery.isLoading && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {jobId && enabled && reportQuery.error instanceof CatalogImportReportNotReadyError && (
        <Card>
          <CardContent className="flex items-center gap-3 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Report not ready — waiting for job to finish…
          </CardContent>
        </Card>
      )}

      {jobId && enabled && reportQuery.error && !(reportQuery.error instanceof CatalogImportReportNotReadyError) && (
        <Card className="border-destructive/30">
          <CardContent className="flex items-start gap-3 py-8">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Could not load import preview</p>
              <p className="mt-1 text-sm text-muted-foreground">{apiErrorMessage(reportQuery.error)}</p>
              <p className="mt-2 text-xs text-muted-foreground">Job: {jobId}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {jobId && enabled && preview && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Dry-run</Badge>
            <Badge variant="secondary">Read-only</Badge>
            <span className="truncate">Job {preview.jobId}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <SummaryCard label="Total records" value={preview.summary.totalRecords} />
            <SummaryCard label="Valid" value={preview.summary.valid} tone="valid" />
            <SummaryCard label="Duplicate" value={preview.summary.duplicate} tone="duplicate" />
            <SummaryCard label="Need review" value={preview.summary.needReview} tone="review" />
            <SummaryCard label="Rejected" value={preview.summary.rejected} tone="rejected" />
            <SummaryCard label="Pending approval" value={preview.summary.pendingReview ?? records.length} tone="review" />
            <SummaryCard label="Approved" value={preview.summary.approved ?? 0} tone="valid" />
            <SummaryCard label="Approval rejected" value={preview.summary.approvalRejected ?? 0} tone="rejected" />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filters & search</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1.5 xl:col-span-2">
                <Label htmlFor="preview-search">Search</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="preview-search"
                    className="pl-9"
                    placeholder="Brand, model, city, errors…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <FilterSelect
                id="preview-brand"
                label="Brand"
                value={brandFilter}
                onChange={setBrandFilter}
                options={[{ value: "all", label: "All brands" }, ...brands.map((b) => ({ value: b, label: b }))]}
              />
              <FilterSelect
                id="preview-city"
                label="City"
                value={cityFilter}
                onChange={setCityFilter}
                options={[{ value: "all", label: "All cities" }, ...cities.map((c) => ({ value: c, label: c }))]}
              />
              <FilterSelect
                id="preview-status"
                label="Status"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as "all" | CatalogImportPreviewStatus)}
                options={[
                  { value: "all", label: "All statuses" },
                  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
                ]}
              />
              <FilterSelect
                id="preview-confidence"
                label="Confidence"
                value={confidenceFilter}
                onChange={(v) => setConfidenceFilter(v as ConfidenceFilter)}
                options={CONFIDENCE_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
              />
            </CardContent>
          </Card>

          <Tabs value={tab} onValueChange={(v) => setTab(v as CatalogImportPreviewStatus | "all")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="h-auto flex-wrap justify-start">
                <TabsTrigger value="valid">Valid ({preview.summary.valid})</TabsTrigger>
                <TabsTrigger value="duplicate">Duplicate ({preview.summary.duplicate})</TabsTrigger>
                <TabsTrigger value="need_review">Need review ({preview.summary.needReview})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({preview.summary.rejected})</TabsTrigger>
              </TabsList>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleSelectAllVisible} disabled={!filtered.length}>
                  {allVisibleSelected ? (
                    <>
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Clear selection
                    </>
                  ) : (
                    <>
                      <Square className="mr-2 h-4 w-4" />
                      Select visible
                    </>
                  )}
                </Button>
                <Badge variant="secondary">{selected.size} selected</Badge>
                <Button
                  size="sm"
                  disabled={!selected.size || approvalMutation.isPending}
                  onClick={() => {
                    setOverrideBlocked(false);
                    setConfirmAction("approve");
                  }}
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  {selected.size > 1 ? "Bulk approve" : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!selected.size || approvalMutation.isPending}
                  onClick={() => {
                    setRejectReason("");
                    setConfirmAction("reject");
                  }}
                >
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  {selected.size > 1 ? "Bulk reject" : "Reject"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!approvedCount || publishMutation.isPending}
                  onClick={() => setPublishConfirmOpen(true)}
                >
                  {publishMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing…
                    </>
                  ) : (
                    <>
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Publish approved ({approvedCount})
                    </>
                  )}
                </Button>
              </div>
            </div>

            {(["valid", "duplicate", "need_review", "rejected"] as const).map((status) => (
              <TabsContent key={status} value={status} className="mt-4">
                <RecordGrid
                  records={filtered}
                  emptyLabel={`No ${STATUS_LABELS[status].toLowerCase()} records match the current filters.`}
                  selected={selected}
                  onToggle={toggleSelect}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
            setRejectReason("");
            setOverrideBlocked(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "approve"
                ? selected.size > 1
                  ? "Confirm bulk approve"
                  : "Confirm approve"
                : selected.size > 1
                  ? "Confirm bulk reject"
                  : "Confirm reject"}
            </DialogTitle>
            <DialogDescription>
              Dry-run only — decisions are stored for this import job and are not published to the public
              website. {selected.size} record(s) selected.
            </DialogDescription>
          </DialogHeader>

          {confirmAction === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection reason</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Why are these records rejected?"
                rows={3}
              />
            </div>
          )}

          {confirmAction === "approve" && (
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1"
                checked={overrideBlocked}
                onChange={(e) => setOverrideBlocked(e.target.checked)}
              />
              <span>
                Super-admin override for invalid / duplicate rows (ignored for low-confidence /
                multi-match, which must stay pending).
              </span>
            </label>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={approvalMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction === "reject" ? "destructive" : "default"}
              disabled={
                approvalMutation.isPending ||
                (confirmAction === "reject" && !rejectReason.trim())
              }
              onClick={() => approvalMutation.mutate()}
            >
              {approvalMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : confirmAction === "approve" ? (
                "Confirm approve"
              ) : (
                "Confirm reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm catalog publish</DialogTitle>
            <DialogDescription>
              This writes APPROVED records into the catalog database. It does not modify marketplace
              listings, dealer uploads, or the public website homepage. {approvedCount} approved
              record(s) will be published.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPublishConfirmOpen(false)}
              disabled={publishMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              {publishMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing…
                </>
              ) : (
                "Confirm publish"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {publishReport && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Publish summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p>Published: {publishReport.summary.published}</p>
            <p>Failed: {publishReport.summary.failed}</p>
            <p>Skipped duplicates: {publishReport.summary.skippedDuplicate}</p>
            <p>Not approved skipped: {publishReport.summary.skippedNotApproved}</p>
            <p>Media failures: {publishReport.summary.mediaFailure}</p>
            <p>Validation failures: {publishReport.summary.validationFailure}</p>
          </CardContent>
        </Card>
      )}

      {jobId && enabled && reportQuery.data && !preview && !reportQuery.isLoading && !reportQuery.error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Car className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">Preview data unavailable</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              The job report loaded but contained no preview projection.
            </p>
          </CardContent>
        </Card>
      )}
    </SuperAdminShell>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "valid" | "duplicate" | "review" | "rejected";
}) {
  const toneClass =
    tone === "valid"
      ? "border-emerald-500/30"
      : tone === "duplicate"
        ? "border-amber-500/30"
        : tone === "review"
          ? "border-sky-500/30"
          : tone === "rejected"
            ? "border-destructive/30"
            : "";
  return (
    <Card className={toneClass}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function RecordGrid({
  records,
  emptyLabel,
  selected,
  onToggle,
}: {
  records: CatalogImportPreviewRecord[];
  emptyLabel: string;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (!records.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
        <Eye className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {records.map((record) => {
        const isSelected = selected.has(record.id);
        return (
          <Card
            key={record.id}
            className={isSelected ? "border-primary ring-1 ring-primary/30" : undefined}
          >
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  className="mt-1 shrink-0 text-muted-foreground"
                  aria-label={isSelected ? "Deselect record" : "Select record"}
                  onClick={() => onToggle(record.id)}
                >
                  {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                </button>
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {record.imageUrl ? (
                    <img
                      src={record.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Car className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusBadgeVariant(record.status)}>
                      {STATUS_LABELS[record.status]}
                    </Badge>
                    <Badge variant="outline">
                      {APPROVAL_LABELS[record.approvalStatus ?? "PENDING_REVIEW"]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Row {record.rowNumber}</span>
                  </div>
                  <p className="mt-1 truncate font-medium">
                    {record.brand} {record.model}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{record.variant}</p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <Field label="Fuel" value={record.fuel} />
                <Field label="Transmission" value={record.transmission} />
                <Field label="Price" value={formatPrice(record.price)} />
                <Field label="City" value={record.city} />
                <Field
                  label="Match confidence"
                  value={
                    record.matchConfidence === null ? "—" : `${record.matchConfidence}%${record.matchMethod ? ` (${record.matchMethod})` : ""}`
                  }
                />
                <Field label="Duplicate reason" value={record.duplicateReason ?? "—"} />
                <Field label="Rule state" value={record.ruleState ?? "—"} />
                <Field
                  label="Approve"
                  value={
                    record.canApprove
                      ? "Allowed"
                      : record.approveBlockReason ?? "Blocked"
                  }
                />
              </dl>

              {record.approvalDecision?.reason && (
                <p className="text-xs text-muted-foreground">
                  Decision reason: {record.approvalDecision.reason}
                </p>
              )}

              {record.validationErrors.length > 0 && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-xs">
                  <p className="mb-1 font-medium text-destructive">Validation errors</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {record.validationErrors.map((error, index) => (
                      <li key={`${record.id}-err-${index}`}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium text-foreground">{value}</dd>
    </div>
  );
}
