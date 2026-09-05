import { useEffect, useState } from "react";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { fetchBillingHistory, fetchFeatureMatrix, fetchManagedPlans, fetchOrgSubscriptions } from "@/features/commercial/commercial.service";
import { setPageMeta } from "@/utils/seo";

export function DealerBillingPage() {
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  const [subs, setSubs] = useState<Array<Record<string, unknown>>>([]);
  const [features, setFeatures] = useState<Array<Record<string, unknown>>>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Billing" });
    void Promise.all([fetchManagedPlans(), fetchOrgSubscriptions(), fetchFeatureMatrix(), fetchBillingHistory()])
      .then(([p, s, f, h]) => {
        setPlans(p);
        setSubs(s);
        setFeatures(f);
        setHistory(h);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unavailable"));
  }, []);

  return (
    <DealerConsoleShell title="Billing" description="Organization plan, feature states, and payment history. Live gateway is off until configured." crumbs={[{ label: "Billing" }]}>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-sm">
        Subscription: {subs[0] ? `${String((subs[0] as { status?: string }).status)}` : "none"}
      </p>
      <div className="dealer-os-card space-y-2">
        {plans.length === 0 && <p className="text-muted-foreground text-sm">No plans configured by admin.</p>}
        {plans.map((plan) => (
          <p key={String(plan.id)} className="text-sm">
            {String(plan.name)} · {String(plan.price)} {String(plan.currency ?? "")} / {String(plan.billingCycle)}
          </p>
        ))}
      </div>
      <div className="dealer-os-card space-y-1">
        {features.map((f) => (
          <p key={String(f.key)} className="text-sm">
            {String(f.key)} · {String(f.state)}
          </p>
        ))}
      </div>
      <div className="dealer-os-card space-y-1">
        {history.length === 0 && <p className="text-sm text-muted-foreground">No payments.</p>}
        {history.map((p) => (
          <p key={String(p.id)} className="text-sm">
            {String(p.purpose)} · {String(p.amount)} · {String(p.status)}
          </p>
        ))}
      </div>
    </DealerConsoleShell>
  );
}
