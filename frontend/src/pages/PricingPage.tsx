import { useEffect } from "react";
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

function Price({ amount, onDark }: { amount: number; onDark?: boolean }) {
  return (
    <>
      {formatCurrency(amount)}
      {amount > 0 ? (
        <span className={cn("text-sm font-normal", onDark ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {" "}
          / month
        </span>
      ) : null}
    </>
  );
}

export function PricingPage() {
  useEffect(() => {
    setPageMeta({
      title: "Pricing — Showroom and DSA plans",
      description: "Motorcart business plans for virtual showrooms and the DSA loan workspace.",
    });
  }, []);

  return (
    <MarketingPageShell className="site-page">
      <section className="bg-primary text-primary-foreground">
        <MarketingPageBody>
          <div className="py-8 sm:py-10">
            <p className="mx-auto w-fit rounded-full border border-primary-foreground/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
              Motorcart Business
            </p>
            <h1 className="mx-auto mt-4 max-w-3xl text-center text-3xl font-bold tracking-normal sm:text-4xl">
              Power your automotive business
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-primary-foreground/85 sm:text-base">
              One platform. Two workspaces — a virtual showroom or a digital loan desk.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <article className="overflow-hidden rounded-2xl border border-primary-foreground/15 bg-black/15">
                <div className="grid sm:grid-cols-2">
                  <div className="p-5">
                    <p className="text-xs font-semibold text-primary-foreground/80">For automobile dealers</p>
                    <h2 className="mt-1 text-xl font-bold tracking-normal">Virtual showroom</h2>
                    <p className="mt-2 text-sm text-primary-foreground/85">
                      Put the showroom online. List stock, catch enquiries, and run the lead desk from one place.
                    </p>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {["Public storefront", "Inventory and lead CRM", "Finance handoff", "Auction desk on Enterprise"].map(
                        (item) => (
                          <li key={item} className="flex gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0" />
                            {item}
                          </li>
                        ),
                      )}
                    </ul>
                    <Button className="mt-4 rounded-full bg-background text-foreground hover:bg-background/90" asChild>
                      <a href="#showroom-plans">
                        Explore showroom plans
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <img
                    src="/brand/hero-automotive-premium-v2.webp"
                    alt="Motorcart virtual showroom"
                    className="h-full min-h-48 w-full object-cover"
                  />
                </div>
                <figure className="border-t border-primary-foreground/15 px-5 py-3 text-sm">
                  <Quote className="mb-1 h-4 w-4 opacity-80" />
                  <blockquote>
                    “The showroom stays open after the gates close. Buyers see the stock, the price, and a way to enquire.”
                  </blockquote>
                </figure>
              </article>

              <article id="dsa-intro" className="overflow-hidden rounded-2xl border border-primary-foreground/15 bg-black/15">
                <div className="grid sm:grid-cols-2">
                  <div className="p-5">
                    <p className="text-xs font-semibold text-primary-foreground/80">For DSAs and loan consultants</p>
                    <h2 className="mt-1 text-xl font-bold tracking-normal">Digital loan workspace</h2>
                    <p className="mt-2 text-sm text-primary-foreground/85">
                      Track applications, documents, and the team from one desk.
                    </p>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {["Lead and application CRM", "EMI and eligibility tools", "Loan marketplace", "Team tracking on Agency"].map(
                        (item) => (
                          <li key={item} className="flex gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0" />
                            {item}
                          </li>
                        ),
                      )}
                    </ul>
                    <Button className="mt-4 rounded-full bg-background text-foreground hover:bg-background/90" asChild>
                      <a href="#dsa-plans">
                        Explore DSA plans
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <img
                    src="/media/vehicles/cars/Hyundai/Creta/01.webp"
                    alt="Vehicle finance on Motorcart"
                    className="h-full min-h-48 w-full object-cover"
                  />
                </div>
                <figure className="border-t border-primary-foreground/15 px-5 py-3 text-sm">
                  <Quote className="mb-1 h-4 w-4 opacity-80" />
                  <blockquote>
                    “Every file has a status. Documents, follow-ups, and the team sit on the same screen.”
                  </blockquote>
                </figure>
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
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <a href="#showroom-plans" className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
              Showroom plans
            </a>
            <a href="#dsa-plans" className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold">
              DSA plans
            </a>
          </div>

          <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
            <section id="showroom-plans" className="rounded-3xl border border-border/80 bg-card/50 p-4">
              <h3 className="text-base font-bold tracking-normal">Showroom plans</h3>
              <p className="text-xs text-muted-foreground">For automobile dealers</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <article
                    key={plan.code}
                    className={cn(
                      "rounded-2xl border bg-background p-4",
                      plan.highlighted ? "border-primary bg-primary text-primary-foreground" : "border-border/80",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold">{plan.name}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          plan.highlighted ? "bg-background/15" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {plan.highlighted ? "Popular" : plan.priceMonthly === 0 ? "Starter" : "Scale"}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      <Price amount={plan.priceMonthly} onDark={plan.highlighted} />
                    </p>
                    <p className={cn("mt-1 text-xs", plan.highlighted ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {plan.maxListings === 9999 ? "Unlimited" : plan.maxListings} listings · {plan.maxTeamMembers} seats
                    </p>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-4 w-full rounded-full"
                      variant={plan.highlighted ? "secondary" : "outline"}
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

            <section id="dsa-plans" className="rounded-3xl border border-border/80 bg-card/50 p-4">
              <h3 className="text-base font-bold tracking-normal">DSA plans</h3>
              <p className="text-xs text-muted-foreground">For loan consultants and agencies</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                {DSA_PLANS.map((plan) => (
                  <article
                    key={plan.code}
                    className={cn(
                      "rounded-2xl border bg-background p-4",
                      plan.highlighted ? "border-primary bg-primary text-primary-foreground" : "border-border/80",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold">{plan.name}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          plan.highlighted ? "bg-background/15" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {plan.highlighted ? "Popular" : plan.priceMonthly === 0 ? "Starter" : "Agency"}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {formatCurrency(plan.priceMonthly)}
                      {plan.priceMonthly > 0 ? (
                        <span className={cn("text-sm font-normal", plan.highlighted ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {" "}
                          / month
                        </span>
                      ) : null}
                    </p>
                    <p className={cn("mt-1 text-xs", plan.highlighted ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {plan.applications} · {plan.seats}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-4 w-full rounded-full"
                      variant={plan.highlighted ? "secondary" : "outline"}
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

          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-primary px-5 py-4 text-primary-foreground sm:flex-row sm:items-center">
            <div>
              <p className="text-lg font-bold tracking-normal">Your business deserves a sharper desk</p>
              <p className="text-sm text-primary-foreground/85">Showroom or DSA. Start on the free plan and move up when the desk is busy.</p>
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
