import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Printer } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { cancelQuotation, getQuotation, issueQuotation } from "../services/quotations.service";
import { snapshotName, type QuotationRecord } from "../types";
import { QuotationBreakdown } from "../components/QuotationBreakdown";
import { QuotationStatusBadge } from "../components/QuotationStatusBadge";
import { QuotationWorkspaceShell, useQuotationWorkspace } from "../components/QuotationWorkspaceShell";
import { setPageMeta } from "@/utils/seo";

export function DealerQuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { basePath } = useQuotationWorkspace();
  const [quote, setQuote] = useState<QuotationRecord | null>(null);

  const reload = () => {
    if (!id) return;
    void getQuotation(id).then(setQuote).catch(() => setQuote(null));
  };

  useEffect(() => {
    setPageMeta({ title: "Quotation" });
    reload();
  }, [id]);

  if (!quote) {
    return (
      <QuotationWorkspaceShell title="Quotation" crumbs={[{ label: "Quotations", href: basePath }]}>
        <p className="text-muted-foreground">Loading…</p>
      </QuotationWorkspaceShell>
    );
  }

  const onIssue = async () => {
    try {
      setQuote(await issueQuotation(quote.id));
      toast.success("Issued");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Issue failed");
    }
  };

  const onCancel = async () => {
    try {
      setQuote(await cancelQuotation(quote.id));
      toast.success("Cancelled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    }
  };

  return (
    <QuotationWorkspaceShell
      title={quote.quotation_number}
      description="Quotation — not a tax invoice, booking, or loan sanction."
      crumbs={[{ label: "Quotations", href: basePath }, { label: quote.quotation_number }]}
      actions={
        <div className="flex flex-wrap gap-2">
          {quote.status === "draft" ? (
            <>
              <Button variant="outline" className="rounded-xl" asChild>
                <Link to={`${basePath}/${quote.id}/edit`}>Edit</Link>
              </Button>
              <Button className="rounded-xl" onClick={() => void onIssue()}>
                Issue
              </Button>
            </>
          ) : null}
          {quote.status === "draft" || quote.status === "issued" ? (
            <Button variant="outline" className="rounded-xl" onClick={() => void onCancel()}>
              Cancel
            </Button>
          ) : null}
          <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
        </div>
      }
    >
      <article className="dealer-os-card space-y-4 print:border-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">MotorCart quotation</p>
            <h2 className="text-xl font-semibold">{quote.quotation_number}</h2>
          </div>
          <QuotationStatusBadge status={quote.status} />
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Customer</dt>
            <dd className="font-medium">{snapshotName(quote.metadata, "customer") || quote.customer_user_id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Dealer</dt>
            <dd className="font-medium">{snapshotName(quote.metadata, "dealer") || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Vehicle</dt>
            <dd className="font-medium">
              {snapshotName(quote.metadata, "vehicle") || snapshotName(quote.metadata, "inventory") || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Validity</dt>
            <dd>
              {quote.validity_start ? new Date(quote.validity_start).toLocaleDateString("en-IN") : "—"}
              {" → "}
              {quote.validity_end ? new Date(quote.validity_end).toLocaleDateString("en-IN") : "—"}
            </dd>
          </div>
        </dl>
        <QuotationBreakdown quote={quote} />
        {quote.notes ? <p className="text-sm text-muted-foreground">{quote.notes}</p> : null}
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          Back to history
        </Button>
      </article>
    </QuotationWorkspaceShell>
  );
}
