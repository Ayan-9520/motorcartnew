import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listQuotations } from "../services/quotations.service";
import { snapshotName, type QuotationRecord } from "../types";
import { QuotationStatusBadge } from "../components/QuotationStatusBadge";
import { QuotationWorkspaceShell, useQuotationWorkspace } from "../components/QuotationWorkspaceShell";
import { formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";

export function DealerQuotationsPage() {
  const { basePath } = useQuotationWorkspace();
  const [rows, setRows] = useState<QuotationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta({ title: "Quotations" });
    void listQuotations()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <QuotationWorkspaceShell
      title="Quotations"
      description="Create, issue and cancel customer quotations. Totals are calculated on the server."
      crumbs={[{ label: "Quotations" }]}
      actions={
        <Button className="rounded-xl" asChild>
          <Link to={`${basePath}/new`}>
            <Plus className="mr-1 h-4 w-4" /> New quotation
          </Link>
        </Button>
      }
    >
      {loading ? <p className="text-muted-foreground">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <div className="dealer-os-card py-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">No quotations yet. Issue one from a lead or inventory row.</p>
          <Button className="mt-4 rounded-xl" asChild>
            <Link to={`${basePath}/new`}>Create quotation</Link>
          </Button>
        </div>
      ) : null}
      <div className="space-y-3">
        {rows.map((q) => (
          <Link key={q.id} to={`${basePath}/${q.id}`} className="dealer-os-card block hover:border-primary/40">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{q.quotation_number}</p>
                <p className="text-sm text-muted-foreground">
                  {snapshotName(q.metadata, "customer") || "Customer"} ·{" "}
                  {snapshotName(q.metadata, "vehicle") || snapshotName(q.metadata, "inventory") || "Vehicle"}
                </p>
              </div>
              <QuotationStatusBadge status={q.status} />
            </div>
            <p className="mt-2 font-medium">{formatCurrency(q.total_amount)}</p>
          </Link>
        ))}
      </div>
    </QuotationWorkspaceShell>
  );
}
