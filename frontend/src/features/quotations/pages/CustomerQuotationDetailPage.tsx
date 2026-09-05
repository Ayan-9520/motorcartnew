import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerEcosystemPage } from "@/features/customer-ecosystem/components/CustomerEcosystemPage";
import { getQuotation } from "../services/quotations.service";
import { snapshotName, type QuotationRecord } from "../types";
import { QuotationBreakdown } from "../components/QuotationBreakdown";
import { QuotationStatusBadge } from "../components/QuotationStatusBadge";
import { setPageMeta } from "@/utils/seo";

export function CustomerQuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<QuotationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Quotation" });
    if (!id) return;
    void getQuotation(id)
      .then(setQuote)
      .catch(() => setError("Quotation not found."));
  }, [id]);

  if (error) {
    return (
      <CustomerEcosystemPage title="Quotation">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/dashboard/customer/quotations">Back</Link>
        </Button>
      </CustomerEcosystemPage>
    );
  }

  if (!quote) {
    return (
      <CustomerEcosystemPage title="Quotation">
        <p className="text-muted-foreground">Loading…</p>
      </CustomerEcosystemPage>
    );
  }

  const vehicle = snapshotName(quote.metadata, "vehicle") || snapshotName(quote.metadata, "inventory") || "Vehicle";
  const dealer = snapshotName(quote.metadata, "dealer") || "Dealer";

  return (
    <CustomerEcosystemPage
      title={quote.quotation_number}
      description={`${vehicle} · ${dealer}`}
      actions={
        <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> Print
        </Button>
      }
    >
      <article className="cos-form-card space-y-4 print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">MotorCart quotation</p>
            <h2 className="text-xl font-semibold">{quote.quotation_number}</h2>
          </div>
          <QuotationStatusBadge status={quote.status} />
        </div>
        {quote.status === "expired" ? (
          <p className="text-sm text-muted-foreground">This quotation has expired and is no longer valid for purchase.</p>
        ) : null}
        {quote.status === "cancelled" ? (
          <p className="text-sm text-muted-foreground">This quotation was cancelled by the dealer.</p>
        ) : null}
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Dealer</dt>
            <dd className="font-medium">{dealer}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Vehicle</dt>
            <dd className="font-medium">{vehicle}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Validity</dt>
            <dd>
              {quote.validity_start ? new Date(quote.validity_start).toLocaleDateString("en-IN") : "—"}
              {" → "}
              {quote.validity_end ? new Date(quote.validity_end).toLocaleDateString("en-IN") : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Pincode</dt>
            <dd>{quote.pincode ?? "—"}</dd>
          </div>
        </dl>
        <QuotationBreakdown quote={quote} />
        {quote.notes ? <p className="text-sm text-muted-foreground">{quote.notes}</p> : null}
      </article>
    </CustomerEcosystemPage>
  );
}
