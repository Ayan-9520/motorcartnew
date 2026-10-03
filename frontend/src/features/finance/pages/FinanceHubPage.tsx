import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Calculator,
  Clock,
  FileText,
  Layers,
  Percent,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPageMeta } from "@/utils/seo";
import { PartnerLogoMarquee } from "@/features/home/components/PartnerLogoMarquee";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { lenderLogoPath } from "@/data/partner-logos";
import { calculateEmi } from "../lib/emi-utils";
import { FINANCE_HUB_CATEGORIES, type FinanceHubCategoryId } from "../data/finance-hub-categories";
import { FinanceHubCard } from "../components/FinanceHubCard";
import { FinanceIconRail } from "../components/FinanceIconRail";
import { FinanceHubQuoteCard } from "../components/FinanceHubQuoteCard";
import { RateCardNote } from "../components/RateCardBits";
import { LENDER_RATE_CARD, lowestPublishedRate, toLoanProduct, type LoanProduct } from "../lib/rate-card";
import { financeOffersPath } from "../lib/finance-hub-routes";

const QUICK_TOOLS = [
  { title: "EMI Calculator", desc: "Monthly EMI & total interest", href: "/finance/tools", icon: Calculator },
  { title: "Check eligibility", desc: "Income + LTV based · soft check", href: "/finance/tools", icon: ShieldCheck },
  { title: "Refinance & save", desc: "Net savings after charges", href: "/finance/tools", icon: TrendingDown },
  { title: "Track application", desc: "Status & lender updates", href: "/dashboard/customer/loans", icon: Clock },
  { title: "Car & bike insurance", desc: "Compare insurer quotes", href: "/insurance", icon: ShieldCheck },
];

const HOW_IT_WORKS = [
  { icon: Calculator, title: "Check your rate", desc: "Pick loan type, amount and CIBIL band. See real lender rates and EMI instantly — no bureau enquiry." },
  { icon: Layers, title: "Compare total cost", desc: "Offers ranked by EMI, interest and processing fee incl. GST — not just the headline rate." },
  { icon: FileText, title: "Apply once", desc: "Submit one application with documents. Our finance desk routes it to the lenders that fit your profile." },
];

const TABLE_PRODUCTS: { product: LoanProduct; label: string }[] = [
  { product: "new_car", label: "New car" },
  { product: "used_car", label: "Used car" },
  { product: "two_wheeler", label: "Two-wheeler" },
  { product: "commercial", label: "Commercial" },
];

function fmtRate(n: number | null | undefined): string {
  return n != null ? `${n.toFixed(2)}%` : "—";
}

export function FinanceHubPage() {
  const lowestNewCar = lowestPublishedRate("new_car");

  useEffect(() => {
    setPageMeta({
      title: "Car, Bike & Commercial Vehicle Loans — Compare Bank Rates | Motorcart",
      description: `Compare ${LENDER_RATE_CARD.length} banks & NBFCs. New car loans from ${fmtRate(lowestNewCar)} p.a. — CIBIL-based rates, EMI, processing fee and total cost before you apply.`,
    });
  }, [lowestNewCar]);

  const productRateFrom = useMemo(() => {
    const map: Partial<Record<FinanceHubCategoryId, string | null>> = {};
    for (const c of FINANCE_HUB_CATEGORIES) {
      if (c.id === "insurance") continue;
      const r = lowestPublishedRate(toLoanProduct(c.id));
      map[c.id] = r != null ? fmtRate(r) : null;
    }
    return map;
  }, []);

  const rateTable = useMemo(
    () =>
      [...LENDER_RATE_CARD]
        .sort((a, b) => b.rankingScore - a.rankingScore)
        .slice(0, 12)
        .map((l) => ({
          ...l,
          logo: lenderLogoPath(l.slug),
          emiPerLakh: l.products.new_car ? calculateEmi(100000, l.products.new_car.min, 60) : null,
        })),
    []
  );

  const trustStats = [
    { icon: Building2, label: String(LENDER_RATE_CARD.length), sub: "Banks & NBFCs" },
    { icon: Percent, label: fmtRate(lowestNewCar), sub: "New car from" },
    { icon: Layers, label: "7", sub: "Loan products" },
    { icon: BadgeCheck, label: "Soft check", sub: "No CIBIL impact" },
  ];

  return (
    <div className="finance-hub-page min-h-screen">
      <section className="fin-hub-hero">
        <div className="container grid grid-cols-[minmax(0,1fr)] items-center gap-8 py-8 md:py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="min-w-0">
            <p className="fin-hub-hero__eyebrow">
              <Sparkles className="h-3.5 w-3.5" /> Motorcart Finance
            </p>
            <h1 className="fin-hub-hero__title">
              Vehicle loans at <span className="text-primary">real bank rates</span>
            </h1>
            <p className="fin-hub-hero__sub">
              Car, bike, EV and commercial vehicle loans from {LENDER_RATE_CARD.length} banks &amp; NBFCs. Rates priced
              for your CIBIL score, with EMI, processing fee and total cost shown upfront.
            </p>
            <ul className="fin-hub-stats">
              {trustStats.map(({ icon: Icon, label, sub }) => (
                <li key={sub} className="fin-hub-stat">
                  <Icon className="h-4 w-4 text-primary" />
                  <span>
                    <strong>{label}</strong>
                    <em>{sub}</em>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button className="rounded-xl shadow-[var(--shadow-primary)]" asChild>
                <Link to="/finance/apply">
                  Apply now <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="rounded-xl" asChild>
                <Link to="/finance/compare">Compare lenders</Link>
              </Button>
            </div>
          </div>
          <motion.div
            className="min-w-0"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <FinanceHubQuoteCard />
          </motion.div>
        </div>
        <div className="container pb-4">
          <FinanceIconRail categories={FINANCE_HUB_CATEGORIES} />
        </div>
      </section>

      <section className="container pb-4 pt-6">
        <div className="mb-4 flex items-end justify-between gap-2">
          <div>
            <h2 className="fin-hub-h2">Loan products</h2>
            <p className="text-xs text-muted-foreground">Lowest published rate per product · compare or apply in minutes</p>
          </div>
        </div>
        <div className="buy-hub-grid-all finance-hub-grid">
          {FINANCE_HUB_CATEGORIES.map((item, i) => (
            <motion.div
              key={item.id}
              id={`finance-${item.id}`}
              className="buy-hub-grid-item scroll-mt-28"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <FinanceHubCard item={item} rateFrom={productRateFrom[item.id]} />
            </motion.div>
          ))}
        </div>
      </section>

      <section className="container py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="fin-hub-h2">Today&apos;s lender rates</h2>
            <p className="text-xs text-muted-foreground">Starting rates p.a. from each lender&apos;s published rate card</p>
          </div>
          <Link to={financeOffersPath()} className="text-sm font-semibold text-primary hover:underline">
            Personalised offers →
          </Link>
        </div>
        <div className="fin-rate-table-wrap">
          <table className="fin-rate-table">
            <thead>
              <tr>
                <th>Lender</th>
                {TABLE_PRODUCTS.map((p) => (
                  <th key={p.product}>{p.label}</th>
                ))}
                <th>EMI / ₹1L (5 yr)</th>
                <th>Processing fee</th>
              </tr>
            </thead>
            <tbody>
              {rateTable.map((l) => (
                <tr key={l.slug}>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <span className="partner-logo-slot shrink-0">
                        <BrandLogo src={l.logo} alt={l.name} size="sm" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-foreground">{l.name}</span>
                        <span className="text-[10px] uppercase text-muted-foreground">{l.lenderType}</span>
                      </span>
                    </span>
                  </td>
                  {TABLE_PRODUCTS.map((p) => (
                    <td key={p.product} className={p.product === "new_car" ? "font-semibold text-primary" : undefined}>
                      {fmtRate(l.products[p.product]?.min)}
                    </td>
                  ))}
                  <td>{l.emiPerLakh != null ? `₹${l.emiPerLakh.toLocaleString("en-IN")}` : "—"}</td>
                  <td className="text-muted-foreground">{l.feeLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <RateCardNote className="mt-3" />
      </section>

      <section className="container py-6">
        <h2 className="fin-hub-h2 mb-4">How it works</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title} className="fin-step">
              <span className="fin-step__num">{i + 1}</span>
              <step.icon className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-bold text-foreground">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container pb-4 pt-2">
        <div className="finance-quick-tools grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {QUICK_TOOLS.map((tool) => (
            <Link key={tool.title} to={tool.href} className="finance-quick-tool group">
              <tool.icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary">{tool.title}</p>
                <p className="text-[11px] text-muted-foreground">{tool.desc}</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 opacity-30 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </section>

      <section className="container pb-12">
        <section className="finance-partners mt-8">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Lenders on Motorcart
          </p>
          <PartnerLogoMarquee />
        </section>

        <div className="fin-hub-cta mt-10">
          <div>
            <p className="text-lg font-bold text-foreground">Ready to get your loan?</p>
            <p className="text-sm text-muted-foreground">One application · documents uploaded once · status tracked in your dashboard</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl shadow-[var(--shadow-primary)]" asChild>
              <Link to="/finance/apply">
                Start application <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to="/finance/offers">Compare all offers</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
