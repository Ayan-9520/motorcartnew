import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { CustomerEcosystemPage } from "@/features/customer-ecosystem/components/CustomerEcosystemPage";
import { listQuotations } from "../services/quotations.service";
import { snapshotName, type QuotationRecord } from "../types";
import { QuotationStatusBadge } from "../components/QuotationStatusBadge";
import { formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";

export function CustomerQuotationsPage() {
  const [rows, setRows] = useState<QuotationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta({ title: "My Quotations" });
    void listQuotations()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CustomerEcosystemPage
      title="My Quotations"
      description="Issued dealer quotations with frozen pricing. Empty until a dealer issues one to you."
    >
      {loading ? <p className="text-muted-foreground">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <div className="cos-empty">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3">No quotations yet. When a dealer issues one, it will appear here.</p>
        </div>
      ) : null}
      <div className="space-y-3">
        {rows.map((q) => (
          <Link
            key={q.id}
            to={`/dashboard/customer/quotations/${q.id}`}
            className="cos-form-card block hover:border-primary/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{q.quotation_number}</p>
                <p className="text-sm text-muted-foreground">
                  {snapshotName(q.metadata, "vehicle") || snapshotName(q.metadata, "inventory") || "Vehicle quotation"}
                  {snapshotName(q.metadata, "dealer") ? ` · ${snapshotName(q.metadata, "dealer")}` : ""}
                </p>
              </div>
              <QuotationStatusBadge status={q.status} />
            </div>
            <p className="mt-2 text-sm font-medium">{formatCurrency(q.total_amount)}</p>
          </Link>
        ))}
      </div>
    </CustomerEcosystemPage>
  );
}
