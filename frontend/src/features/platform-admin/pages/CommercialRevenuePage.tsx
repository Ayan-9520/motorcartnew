import { useEffect, useState } from "react";
import { setPageMeta } from "@/utils/seo";
import { SuperAdminShell } from "../components/SuperAdminShell";
import { fetchManagedPlans, fetchReconciliations, fetchRevenueDashboard } from "@/features/commercial/commercial.service";

export function CommercialRevenuePage() {
  const [metrics, setMetrics] = useState<Record<string, unknown>>({});
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  const [recon, setRecon] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Revenue — Super Admin" });
    void Promise.all([fetchRevenueDashboard(), fetchManagedPlans(), fetchReconciliations()])
      .then(([m, p, r]) => {
        setMetrics(m);
        setPlans(p);
        setRecon(r);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unavailable"));
  }, []);

  return (
    <SuperAdminShell title="Revenue" description="Ledger-backed subscription, credit, payout and mismatch totals. Empty when no history.">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Subscription", metrics.subscriptionRevenue],
          ["Lead credits", metrics.leadCreditRevenue],
          ["Featured / marketing", metrics.featuredListingRevenue],
          ["Partner payable", metrics.partnerPayable],
          ["Settled", metrics.settled],
          ["Outstanding", metrics.outstanding],
          ["Mismatches", metrics.mismatchCount],
          ["Finance realized", metrics.financeRealizedPayout],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{String(label)}</p>
            <p className="text-lg font-semibold tabular-nums">{value == null ? 0 : String(value)}</p>
          </div>
        ))}
      </div>
      <h3 className="mt-6 text-sm font-semibold">Plans</h3>
      {plans.length === 0 && <p className="text-sm text-muted-foreground">No admin-configured plans yet.</p>}
      {plans.map((p) => (
        <p key={String(p.id)} className="text-sm">
          {String(p.name)} · {String(p.slug)} · {String(p.price)} {String(p.currency ?? "INR")} / {String(p.billingCycle)}
        </p>
      ))}
      <h3 className="mt-6 text-sm font-semibold">Reconciliation</h3>
      {recon.length === 0 && <p className="text-sm text-muted-foreground">No reconciliation rows.</p>}
      {recon.map((row) => (
        <p key={String(row.id)} className="text-sm">
          {String(row.source)} {String(row.period)} · {String(row.status)} · expected {String(row.expectedAmount)} received {String(row.receivedAmount)}
        </p>
      ))}
    </SuperAdminShell>
  );
}
