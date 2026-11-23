import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Landmark, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingPageBody, MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { SUBSCRIPTION_PLANS } from "@/features/dealer-crm/data/subscription-plans";
import { DSA_PLANS, DSA_PLATFORM_SHARE_PERCENT } from "@/features/finance/data/dsa-plans";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";

function Price({ amount }: { amount: number }) {
  if (amount === 0) return <>Free</>;
  return (
    <>
      {formatCurrency(amount)}
      <span className="text-sm font-normal text-muted-foreground"> / month</span>
    </>
  );
}

export function PricingPage() {
  useEffect(() => {
    setPageMeta({
      title: "Pricing — Showroom and DSA plans",
      description:
        "Motorcart plans for showrooms and loan agents. Inventory, lead CRM, and DSA desk, shown side by side.",
    });
  }, []);

  return (
    <MarketingPageShell className="site-page">
      <section className="marketing-hero marketing-hero-slim marketing-hero-editorial">
        <div className="marketing-hero-mesh" aria-hidden />
        <MarketingPageBody narrow>
          <h1 className="site-page-title">
            Plans for <span className="text-primary">showrooms</span> and{" "}
            <span className="text-primary">loan agents</span>
          </h1>
          <p className="site-page-lead">
            Two desks, same marketplace. Pick the column that matches your work. Prices are public. A Motorcart
            admin assigns the plan after signup.
          </p>
        </MarketingPageBody>
      </section>

      <MarketingPageBody>
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <section id="showroom-plans" className="rounded-3xl border border-border/80 bg-card/60 p-4 sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Store className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">For showrooms</p>
                <h2 className="text-xl font-bold tracking-normal">Dealer plans</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  List cars, run lead CRM, and sell from your public storefront.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <article
                  key={plan.code}
                  className={cn(
                    "rounded-2xl border bg-background p-4",
                    plan.highlighted ? "border-primary/40 ring-1 ring-primary/20" : "border-border/70",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold tracking-normal">{plan.name}</h3>
                      <p className="text-2xl font-bold">
                        <Price amount={plan.priceMonthly} />
                      </p>
                    </div>
                    {plan.highlighted ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.maxListings === 9999 ? "Unlimited" : plan.maxListings} listings · {plan.maxTeamMembers}{" "}
                    team seats
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-4 w-full rounded-xl" variant={plan.highlighted ? "default" : "outline"} asChild>
                    <Link to="/signup/business">
                      Start as a showroom
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </article>
              ))}
            </div>
          </section>

          <section id="dsa-plans" className="rounded-3xl border border-border/80 bg-card/60 p-4 sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Landmark className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">For loan agents</p>
                <h2 className="text-xl font-bold tracking-normal">DSA plans</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  File loans, track documents, and see payouts. MotorCart keeps {DSA_PLATFORM_SHARE_PERCENT}% of
                  the bank commission, not of the loan.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {DSA_PLANS.map((plan) => (
                <article
                  key={plan.code}
                  className={cn(
                    "rounded-2xl border bg-background p-4",
                    plan.highlighted ? "border-primary/40 ring-1 ring-primary/20" : "border-border/70",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold tracking-normal">{plan.name}</h3>
                      <p className="text-2xl font-bold">
                        <Price amount={plan.priceMonthly} />
                      </p>
                    </div>
                    {plan.highlighted ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.applications} · {plan.seats}
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-4 w-full rounded-xl" variant={plan.highlighted ? "default" : "outline"} asChild>
                    <Link to="/signup/business">
                      Start as a DSA
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-10 rounded-2xl border border-border/80 bg-muted/20 p-6 text-center">
          <h2 className="text-lg font-semibold tracking-normal">OEM, fleet, or multi-city rollout</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Showroom Enterprise includes the auction desk, API access, and a dedicated success manager.
          </p>
          <Button variant="outline" className="mt-4 rounded-xl" asChild>
            <Link to="/contact">Contact sales</Link>
          </Button>
        </div>
      </MarketingPageBody>
    </MarketingPageShell>
  );
}
