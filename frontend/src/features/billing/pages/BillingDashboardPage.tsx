import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Gauge, Shield } from "lucide-react";
import { featureFlags } from "@/config/feature-flags";
import {
  changeBillingPlanApi,
  fetchBillingOverviewApi,
  fetchBillingPlansApi,
} from "@/integrations/api/billing";
import { BillingShell } from "@/features/billing/components/BillingShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function BillingDashboardPage() {
  const enabled = featureFlags.billingV2;
  const qc = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ["billing-plans"],
    queryFn: fetchBillingPlansApi,
    retry: 1,
  });

  const overviewQuery = useQuery({
    queryKey: ["billing-overview"],
    queryFn: () => fetchBillingOverviewApi(),
    retry: 1,
  });

  const upgrade = useMutation({
    mutationFn: (planSlug: string) =>
      changeBillingPlanApi({ plan_slug: planSlug, billing_cycle: "monthly" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-overview"] });
    },
  });

  const overview = overviewQuery.data;
  const sub = overview?.subscription as {
    subscription?: { plan_slug?: string; status?: string; billing_cycle?: string };
    plan?: { name?: string; slug?: string };
    payments_note?: string;
  } | undefined;
  const currentSlug = sub?.subscription?.plan_slug ?? sub?.plan?.slug ?? "free";

  return (
    <BillingShell
      title="Billing & subscription"
      description="Plans and entitlements. Online payment is not configured."
    >
      {!enabled && (
        <p className="mb-4 text-xs text-muted-foreground">
          Billing API is warming up — plan cards load when the API is reachable.
        </p>
      )}
      {overviewQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Loading billing overview…</p>
      )}
      {overviewQuery.error && (
        <p className="text-sm text-destructive">Could not load billing. Sign in and ensure the API flag is on.</p>
      )}

      {overview && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Current plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">{sub?.plan?.name ?? currentSlug}</span>
                <Badge variant="secondary" className="ml-2">
                  {sub?.subscription?.status ?? "active"}
                </Badge>
              </p>
              <p className="text-muted-foreground">{sub?.payments_note}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Gauge className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Usage ({overview.usage.period})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {overview.usage.meters.map((m) => (
                <div key={m.key}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-mono text-muted-foreground">{m.key}</span>
                    <span>
                      {m.used} / {m.limit > 0 ? m.limit : "∞"}
                    </span>
                  </div>
                  {m.percent != null && m.limit > 0 ? (
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${m.percent}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Plans (mock upgrade)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(plansQuery.data ?? []).map((plan) => (
                <div
                  key={plan.slug}
                  className="rounded-lg border border-border/60 p-4 text-sm"
                >
                  <p className="font-semibold">{plan.name}</p>
                  <p className="text-muted-foreground">
                    ₹{plan.price_monthly_inr.toLocaleString("en-IN")}/mo
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 w-full"
                    variant={currentSlug === plan.slug ? "secondary" : "default"}
                    disabled={currentSlug === plan.slug || upgrade.isPending}
                    onClick={() => upgrade.mutate(plan.slug)}
                  >
                    {currentSlug === plan.slug ? "Current" : "Select (mock)"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {overview.invoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mock invoices (draft)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-5">
                  {overview.invoices.map((inv) => (
                    <li key={String(inv.id)}>
                      {String(inv.invoice_number)} — {String(inv.status)} — ₹
                      {Number(inv.total_inr).toLocaleString("en-IN")}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </BillingShell>
  );
}
