import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingPageBody, MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { SUBSCRIPTION_PLANS } from "@/features/dealer-crm/data/subscription-plans";
import { formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";

export function PricingPage() {
  useEffect(() => {
    setPageMeta({
      title: "Pricing — Motorcart Dealer OS",
      description:
        "Dealer SaaS plans for inventory, lead CRM, bulk Excel upload, auctions, and analytics on Motorcart.in.",
    });
  }, []);

  return (
    <MarketingPageShell className="site-page">
      <section className="marketing-hero marketing-hero-slim marketing-hero-editorial">
        <div className="marketing-hero-mesh" aria-hidden />
        <MarketingPageBody narrow>
          <p className="site-eyebrow">
            <Sparkles className="h-3.5 w-3.5" />
            Dealer SaaS
          </p>
          <h1 className="site-page-title">
            Plans for every <span className="text-primary">showroom size</span>
          </h1>
          <p className="site-page-lead">
            List inventory, capture marketplace leads, run CRM, and upload bulk Excel — all connected to
            Motorcart&apos;s public marketplace and admin approvals.
          </p>
        </MarketingPageBody>
      </section>

      <MarketingPageBody>
        <div className="grid gap-6 md:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <Card
              key={plan.code}
              className={
                plan.highlighted
                  ? "border-primary/40 shadow-[var(--shadow-primary)] ring-1 ring-primary/20"
                  : "border-border/80"
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  {plan.name}
                  {plan.highlighted ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      Popular
                    </span>
                  ) : null}
                </CardTitle>
                <p className="text-3xl font-bold text-foreground">
                  {plan.priceMonthly === 0 ? "Free" : formatCurrency(plan.priceMonthly)}
                  {plan.priceMonthly > 0 ? (
                    <span className="text-sm font-normal text-muted-foreground"> / month</span>
                  ) : null}
                </p>
                <p className="text-sm text-muted-foreground">
                  Up to {plan.maxListings === 9999 ? "unlimited" : plan.maxListings} listings ·{" "}
                  {plan.maxTeamMembers} team seats
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full rounded-xl" variant={plan.highlighted ? "default" : "outline"} asChild>
                  <Link to="/signup/business">
                    Get started
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-border/80 bg-muted/20 p-6 text-center">
          <h2 className="text-lg font-semibold">Need OEM, fleet, or multi-city rollout?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enterprise includes auction desk, API access, and dedicated onboarding.
          </p>
          <Button variant="outline" className="mt-4 rounded-xl" asChild>
            <Link to="/contact">Contact sales</Link>
          </Button>
        </div>
      </MarketingPageBody>
    </MarketingPageShell>
  );
}
