import { useEffect } from "react";
import { Check } from "lucide-react";
import { setPageMeta } from "@/utils/seo";
import { formatCurrency } from "@/lib/utils";
import { FinanceDashboardShell } from "../components/FinanceDashboardShell";
import { DsaWorkspaceNav } from "../components/DsaWorkspaceNav";
import { DSA_PLANS, DSA_PLATFORM_SHARE_PERCENT } from "../data/dsa-plans";
import { cn } from "@/lib/utils";

export function DsaPlansPage() {
  useEffect(() => {
    setPageMeta({ title: "DSA plans — Motorcart Finance" });
  }, []);

  return (
    <FinanceDashboardShell
      variant="dsa"
      title="DSA plans"
      subtitle="Desk fee is monthly. MotorCart's share is taken from the bank payout, not from the loan amount."
    >
      <DsaWorkspaceNav />
      <div className="grid gap-4 md:grid-cols-3">
        {DSA_PLANS.map((plan) => (
          <article
            key={plan.code}
            className={cn(
              "rounded-2xl border bg-card p-5",
              plan.highlighted ? "border-primary/40 ring-1 ring-primary/20" : "border-border/80",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold tracking-normal">{plan.name}</h2>
              {plan.highlighted ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  Popular
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-3xl font-bold">
              {plan.priceMonthly === 0 ? "Free" : formatCurrency(plan.priceMonthly)}
              {plan.priceMonthly > 0 ? (
                <span className="text-sm font-normal text-muted-foreground"> / month</span>
              ) : null}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {plan.applications} · {plan.seats}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">Assigned by MotorCart admin</p>
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        On a disbursed file, MotorCart keeps {DSA_PLATFORM_SHARE_PERCENT}% of the commission the bank pays the DSA.
        Example: ₹8,00,000 loan, bank commission 1% = ₹8,000, platform share ₹1,200, DSA receives ₹6,800.
        Marketplace leads are bought with credits and are not included in these plans.
      </p>
    </FinanceDashboardShell>
  );
}
