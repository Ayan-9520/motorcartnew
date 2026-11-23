import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  Headphones,
  Quote,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingPageBody, MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { SUBSCRIPTION_PLANS } from "@/features/dealer-crm/data/subscription-plans";
import { DSA_PLANS } from "@/features/finance/data/dsa-plans";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";

const PILLARS = [
  { icon: Zap, title: "All-in-one platform", text: "Inventory, finance, leads and more" },
  { icon: BarChart3, title: "Grow your business", text: "More enquiries and loan files" },
  { icon: ShieldCheck, title: "Trusted and secure", text: "Role-based access and KYC" },
  { icon: Headphones, title: "Dedicated support", text: "Onboarding and ongoing help" },
] as const;

type BillingCycle = "monthly" | "quarterly" | "yearly";

const CYCLES: { id: BillingCycle; label: string; months: number; off: number; per: string }[] = [
  { id: "monthly", label: "Monthly", months: 1, off: 0, per: "month" },
  { id: "quarterly", label: "Quarterly", months: 3, off: 0.1, per: "quarter" },
  { id: "yearly", label: "Yearly", months: 12, off: 0.2, per: "year" },
];

function cycleCharge(monthly: number, cycle: (typeof CYCLES)[number]) {
  if (monthly <= 0) return 0;
  return Math.round(monthly * cycle.months * (1 - cycle.off));
}

export function PricingPage() {
  const [cycleId, setCycleId] = useState<BillingCycle>("monthly");
  const cycle = CYCLES.find((item) => item.id === cycleId) ?? CYCLES[0];

  useEffect(() => {
    setPageMeta({
      title: "Pricing — Showroom and DSA plans",
      description: "Motorcart business plans for virtual showrooms and the DSA loan workspace.",
    });
  }, []);

  return (
    <MarketingPageShell className="site-page">
      <section className="bg-background">
        <MarketingPageBody>
          <div className="py-8 sm:py-10">
            <p className="mx-auto w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
              Motorcart Business
            </p>
            <h1 className="mx-auto mt-4 max-w-3xl text-center text-3xl font-bold tracking-normal text-foreground sm:text-4xl">
              Power your automotive business
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground sm:text-base">
              One platform. Two workspaces — a virtual showroom or a digital loan desk.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                <img src="/brand/pricing-showroom.jpg" alt="Virtual showroom" className="h-52 w-full object-cover sm:h-64" />
                <div className="p-5">
                  <p className="text-xs font-semibold text-primary">For automobile dealers</p>
                  <h2 className="mt-1 text-xl font-bold tracking-normal">Virtual showroom</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Put the showroom online. List stock, catch enquiries, and run the lead desk from one place.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {["Public storefront", "Inventory and lead CRM", "Finance handoff", "Auction desk on Enterprise"].map(
                      (item) => (
                        <li key={item} className="flex gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                  <figure className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
                    <Quote className="mb-1 h-4 w-4 text-primary" />
                    <blockquote>
                      “The showroom stays open after the gates close. Buyers see the stock, the price, and a way to enquire.”
                    </blockquote>
                  </figure>
                  <Button className="mt-4 rounded-full" asChild>
                    <a href="#showroom-plans">
                      Explore showroom plans
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </article>

              <article id="dsa-intro" className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                <img src="/brand/pricing-dsa.jpg" alt="Digital loan workspace" className="h-52 w-full object-cover sm:h-64" />
                <div className="p-5">
                  <p className="text-xs font-semibold text-primary">For DSAs and loan consultants</p>
                  <h2 className="mt-1 text-xl font-bold tracking-normal">Digital loan workspace</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Track applications, documents, and the team from one desk.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {["Lead and application CRM", "EMI and eligibility tools", "Loan marketplace", "Team tracking on Agency"].map(
                      (item) => (
                        <li key={item} className="flex gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                  <figure className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
                    <Quote className="mb-1 h-4 w-4 text-primary" />
                    <blockquote>
                      “Every file has a status. Documents, follow-ups, and the team sit on the same screen.”
                    </blockquote>
                  </figure>
                  <Button className="mt-4 rounded-full" variant="outline" asChild>
                    <a href="#dsa-plans">
                      Explore DSA plans
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </article>
            </div>
          </div>
        </MarketingPageBody>
      </section>

      <section className="border-b border-border/70 bg-background">
        <MarketingPageBody>
          <div className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </MarketingPageBody>
      </section>

      <MarketingPageBody>
        <div className="py-8">
          <h2 className="text-center text-2xl font-bold tracking-normal">Choose your business plan</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Showroom plans and DSA plans, side by side.
          </p>
          <div className="mx-auto mt-4 flex w-fit rounded-full border border-border bg-card p-1">
            {CYCLES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCycleId(item.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-semibold",
                  cycleId === item.id ? "bg-primary text-primary-foreground" : "text-foreground",
                )}
              >
                {item.label}
                {item.off > 0 ? <span className="ml-1 text-[11px] font-bold">{item.off * 100}% off</span> : null}
              </button>
            ))}
          </div>

          <div className="mt-6 grid items-stretch gap-6 xl:grid-cols-2">
            <section id="showroom-plans" className="flex h-full flex-col rounded-3xl border border-primary/20 bg-card p-4 shadow-sm">
              <h3 className="text-base font-bold tracking-normal">Showroom plans</h3>
              <p className="text-xs text-muted-foreground">For automobile dealers</p>
              <div className="mt-3 grid flex-1 grid-cols-1 items-stretch gap-3 sm:grid-cols-3">
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <article
                    key={plan.code}
                    className={cn(
                      "group flex h-full min-h-[26rem] flex-col rounded-2xl border-2 bg-background p-4 shadow-sm transition-colors",
                      plan.highlighted
                        ? "border-primary shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.45)]"
                        : "border-primary/25 hover:border-primary",
                      "hover:bg-primary hover:text-primary-foreground",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold">{plan.name}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          plan.highlighted ? "bg-primary/10 text-primary group-hover:bg-background/15 group-hover:text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-background/15 group-hover:text-primary-foreground",
                        )}
                      >
                        {plan.highlighted ? "Premium" : plan.priceMonthly === 0 ? "Free" : "Scale"}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(cycleCharge(plan.priceMonthly, cycle))}</p>
                    <p className="text-xs text-muted-foreground group-hover:text-primary-foreground/80">
                      {plan.priceMonthly === 0 ? "Free" : `per ${cycle.per}`}
                      {cycle.off > 0 && plan.priceMonthly > 0 ? ` · was ${formatCurrency(plan.priceMonthly * cycle.months)}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground group-hover:text-primary-foreground/80">
                      {plan.maxListings === 9999 ? "Unlimited" : plan.maxListings} listings · {plan.maxTeamMembers} seats
                    </p>
                    <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="outline"
                      className="mt-auto w-full rounded-full border-border bg-background text-foreground group-hover:border-background group-hover:bg-background"
                      asChild
                    >
                      <Link to={plan.code === "enterprise" ? "/contact" : "/signup/business"}>
                        {plan.priceMonthly === 0 ? "Get started free" : plan.code === "enterprise" ? "Talk to sales" : "Start Premium"}
                      </Link>
                    </Button>
                  </article>
                ))}
              </div>
            </section>

            <section id="dsa-plans" className="flex h-full flex-col rounded-3xl border border-primary/20 bg-card p-4 shadow-sm">
              <h3 className="text-base font-bold tracking-normal">DSA plans</h3>
              <p className="text-xs text-muted-foreground">For loan consultants and agencies</p>
              <div className="mt-3 grid flex-1 grid-cols-1 items-stretch gap-3 sm:grid-cols-3">
                {DSA_PLANS.map((plan) => (
                  <article
                    key={plan.code}
                    className={cn(
                      "group flex h-full min-h-[26rem] flex-col rounded-2xl border-2 bg-background p-4 shadow-sm transition-colors",
                      plan.highlighted
                        ? "border-primary shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.45)]"
                        : "border-primary/25 hover:border-primary",
                      "hover:bg-primary hover:text-primary-foreground",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold">{plan.name}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          plan.highlighted ? "bg-primary/10 text-primary group-hover:bg-background/15 group-hover:text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-background/15 group-hover:text-primary-foreground",
                        )}
                      >
                        {plan.highlighted ? "Premium" : plan.priceMonthly === 0 ? "Free" : "Agency"}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(cycleCharge(plan.priceMonthly, cycle))}</p>
                    <p className="text-xs text-muted-foreground group-hover:text-primary-foreground/80">
                      {plan.priceMonthly === 0 ? "Free" : `per ${cycle.per}`}
                      {cycle.off > 0 && plan.priceMonthly > 0 ? ` · was ${formatCurrency(plan.priceMonthly * cycle.months)}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground group-hover:text-primary-foreground/80">
                      {plan.applications} · {plan.seats}
                    </p>
                    <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="outline"
                      className="mt-auto w-full rounded-full border-border bg-background text-foreground group-hover:border-background group-hover:bg-background"
                      asChild
                    >
                      <Link to={plan.code === "agency" ? "/contact" : "/signup/business"}>
                        {plan.priceMonthly === 0 ? "Get started free" : plan.code === "agency" ? "Talk to sales" : "Start Growth"}
                      </Link>
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/20 bg-card px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-lg font-bold tracking-normal">Your business deserves a sharper desk</p>
              <p className="text-sm text-muted-foreground">Showroom or DSA. Start on the free plan and move up when the desk is busy.</p>
            </div>
            <Button className="rounded-full bg-background text-foreground hover:bg-background/90" asChild>
              <Link to="/signup/business">
                Get started
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </MarketingPageBody>
    </MarketingPageShell>
  );
}
