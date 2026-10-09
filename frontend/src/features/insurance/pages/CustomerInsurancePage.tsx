import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, CreditCard, ExternalLink, FileText, Plus, RefreshCw, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { setPageMeta } from "@/utils/seo";
import { formatCurrency } from "@/lib/utils";
import { useInsuranceApplications } from "../hooks/useInsuranceApplications";
import { applicationStatusLabel } from "../lib/insurance-engine";
import { updateMotorApplication } from "../services/insurance.service";
import { FinanceDashboardShell } from "@/features/finance/components/FinanceDashboardShell";

const OPEN = new Set(["submitted", "under_review", "inspection_pending", "quote_confirmed", "payment_pending"]);

export function CustomerInsurancePage() {
  const { applications, loading, error, refetch } = useInsuranceApplications();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: "My insurance — Motorcart" });
  }, []);

  const cancel = async (id: string) => {
    if (!window.confirm("Cancel this insurance application?")) return;
    setBusy(id);
    const r = await updateMotorApplication(id, { status: "cancelled" });
    setBusy(null);
    if (!r.ok) toast.error(r.error);
    else {
      toast.success("Application cancelled");
      void refetch();
    }
  };

  return (
    <FinanceDashboardShell
      variant="customer"
      title="My insurance"
      subtitle="Applications, issued policies, renewals & claims"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" asChild>
            <Link to="/insurance/claims">File a claim</Link>
          </Button>
          <Button className="rounded-full" asChild>
            <Link to="/insurance">
              <Plus className="h-4 w-4 mr-1" /> New policy
            </Link>
          </Button>
        </div>
      }
    >
      {loading && <p className="text-muted-foreground">Loading policies…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!loading && !error && applications.length === 0 && (
        <div className="ins-empty-policy rounded-2xl border border-dashed p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground">No insurance applications yet</p>
          <Button className="mt-4 rounded-full" asChild>
            <Link to="/insurance">Get car or bike insurance</Link>
          </Button>
        </div>
      )}

      <ul className="space-y-4">
        {applications.map((app) => {
          const m = app.metadata;
          const vehicle = `${m.vehicle?.make ?? m.quoteInput?.make ?? ""} ${m.vehicle?.model ?? m.quoteInput?.model ?? ""}`.trim();
          const last = m.timeline?.[m.timeline.length - 1];
          const policyEnd = m.policyEnd ? new Date(m.policyEnd) : null;
          const daysLeft = policyEnd ? Math.ceil((policyEnd.getTime() - Date.now()) / 86400000) : null;
          return (
            <li key={app.id} className="ins-policy-card space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{m.insurerName ?? app.provider ?? "Insurer"}</p>
                  <p className="text-sm text-muted-foreground">
                    {vehicle || "Vehicle"}
                    {m.vehicle?.registrationNumber ? ` · ${m.vehicle.registrationNumber}` : ""} · {m.planLabel ?? "Motor policy"}
                  </p>
                  {m.reference && <p className="text-[11px] text-muted-foreground">Ref {m.reference}</p>}
                </div>
                <Badge variant={app.status === "issued" ? "default" : "outline"}>{applicationStatusLabel(app.status)}</Badge>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="text-lg font-bold text-primary">{app.premium != null ? formatCurrency(app.premium) : "—"}</p>
                <span className="text-xs text-muted-foreground">
                  {m.finalPremium ? "Final premium confirmed by insurer" : "Indicative premium incl. GST"}
                  {m.quote?.idv ? ` · IDV ${formatCurrency(m.quote.idv)}` : ""}
                  {m.quote?.ncbPercent ? ` · NCB ${m.quote.ncbPercent}%` : ""}
                </span>
              </div>

              {app.status === "issued" && (
                <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-sm">
                  Policy <strong>{m.policyNumber}</strong>
                  {m.policyStart && m.policyEnd && (
                    <>
                      {" "}· {new Date(m.policyStart).toLocaleDateString("en-IN")} – {new Date(m.policyEnd).toLocaleDateString("en-IN")}
                    </>
                  )}
                  {daysLeft != null && daysLeft <= 45 && (
                    <span className="ml-1 font-semibold text-amber-700">
                      · {daysLeft >= 0 ? `renew in ${daysLeft} days` : `expired ${-daysLeft} days ago`}
                    </span>
                  )}
                </div>
              )}

              {last?.note && <p className="text-xs text-muted-foreground">Latest: “{last.note}”</p>}

              <div className="flex flex-wrap gap-2">
                {app.status === "payment_pending" && m.paymentLink && (
                  <Button size="sm" className="rounded-lg" asChild>
                    <a href={m.paymentLink} target="_blank" rel="noopener noreferrer">
                      <CreditCard className="mr-1 h-4 w-4" /> Pay on insurer site <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                )}
                {app.status === "inspection_pending" && m.inspectionLink && (
                  <Button size="sm" variant="outline" className="rounded-lg" asChild>
                    <a href={m.inspectionLink} target="_blank" rel="noopener noreferrer">
                      <Camera className="mr-1 h-4 w-4" /> Start self-inspection
                    </a>
                  </Button>
                )}
                {m.policyDocumentUrl && (
                  <Button size="sm" variant="outline" className="rounded-lg" asChild>
                    <a href={m.policyDocumentUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="mr-1 h-4 w-4" /> Policy PDF
                    </a>
                  </Button>
                )}
                {app.status === "issued" && (
                  <Button size="sm" variant="ghost" className="rounded-lg" asChild>
                    <Link to={`/insurance/renew?type=${m.quoteInput?.vehicleType ?? "car"}`}>
                      <RefreshCw className="mr-1 h-4 w-4" /> Renew
                    </Link>
                  </Button>
                )}
                {OPEN.has(app.status) && (
                  <Button size="sm" variant="ghost" className="rounded-lg text-rose-600" disabled={busy === app.id} onClick={() => void cancel(app.id)}>
                    Cancel
                  </Button>
                )}
              </div>

              {m.timeline && m.timeline.length > 1 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-semibold">Timeline</summary>
                  <ol className="mt-2 space-y-1 border-l pl-3">
                    {m.timeline.map((t, i) => (
                      <li key={`${t.at}-${i}`}>
                        <strong className="text-foreground">{applicationStatusLabel(t.status)}</strong> ·{" "}
                        {new Date(t.at).toLocaleString("en-IN")}
                        {t.note ? ` — ${t.note}` : ""}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </FinanceDashboardShell>
  );
}
