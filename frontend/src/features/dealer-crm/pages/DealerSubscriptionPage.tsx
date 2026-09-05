import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { fetchFeatureMatrix, fetchManagedPlans, fetchOrgSubscriptions } from "@/features/commercial/commercial.service";
import { setPageMeta } from "@/utils/seo";
import { cn } from "@/lib/utils";

export function DealerSubscriptionPage() {
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  const [subs, setSubs] = useState<Array<Record<string, unknown>>>([]);
  const [features, setFeatures] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Subscription plans" });
    void Promise.all([fetchManagedPlans(), fetchOrgSubscriptions(), fetchFeatureMatrix()])
      .then(([p, s, f]) => {
        setPlans(p);
        setSubs(s);
        setFeatures(f);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unavailable"));
  }, []);

  const current = subs[0] as { status?: string; plan?: { slug?: string; name?: string } } | undefined;

  return (
    <DealerConsoleShell
      title="Subscription plans"
      description="Admin-configured organization plans. Prices come from billing, not this page."
      crumbs={[{ label: "Plans" }]}
    >
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-sm text-muted-foreground">
        Current: <strong className="text-foreground">{current?.plan?.name ?? current?.status ?? "none"}</strong>
      </p>
      <div className="dealer-plans-grid">
        {plans.length === 0 && <p className="text-sm text-muted-foreground">No plans published.</p>}
        {plans.map((plan) => {
          const featuresList = Array.isArray(plan.includedFeatures) ? (plan.includedFeatures as string[]) : [];
          const active = current?.plan?.name === plan.name || String(plan.slug) === String(current?.plan?.slug ?? "");
          return (
            <article key={String(plan.id)} className={cn("dealer-plan-card", active && "dealer-plan-card-active")}>
              <h3 className="text-lg font-bold">{String(plan.name)}</h3>
              <p className="dealer-plan-price">
                {String(plan.price)} {String(plan.currency ?? "INR")}
                <span className="text-xs font-normal text-muted-foreground">/{String(plan.billingCycle)}</span>
              </p>
              <ul className="dealer-plan-features">
                {featuresList.map((f) => (
                  <li key={f}>
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-4">{active ? "Current plan" : "Assigned by MotorCart admin"}</p>
            </article>
          );
        })}
      </div>
      <div className="dealer-os-card space-y-1 mt-4">
        {features.map((f) => (
          <p key={String(f.key)} className="text-sm">
            {String(f.key)} · {String(f.state)}
          </p>
        ))}
      </div>
    </DealerConsoleShell>
  );
}
