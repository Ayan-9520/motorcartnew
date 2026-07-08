import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Building2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { setPageMeta } from "@/utils/seo";
import { useFinanceMarketplace } from "../hooks/useFinanceMarketplace";
import { EmiCalculatorWidget } from "../components/EmiCalculatorWidget";
import { EligibilityChecker } from "../components/EligibilityChecker";
import { BankOfferCard } from "../components/BankOfferCard";
import { AiRecommendationPanel } from "../components/AiRecommendationPanel";
import { CibilEstimatorPanel } from "../components/CibilEstimatorPanel";
import { RefinancePanel } from "../components/RefinancePanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { FinanceSubpageShell } from "../components/FinanceSubpageShell";
import { FinanceSubpageQuickLinks } from "../components/FinanceSubpageQuickLinks";
import { FeaturedPartnerBanksStrip } from "../components/FeaturedPartnerBanksStrip";
import { financeCategoryLabel, parseFinanceType } from "../lib/finance-hub-routes";

export function FinanceMarketplacePage() {
  const [params] = useSearchParams();
  const loanType = parseFinanceType(params.get("type"));
  const {
    offers,
    recommendations,
    loading,
    loanAmount,
    tenureMonths,
    setLoanAmount,
    setTenureMonths,
    setEligibility,
  } = useFinanceMarketplace();

  const [tab, setTab] = useState<"offers" | "tools">("offers");
  const applyHref = loanType ? `/finance/apply?type=${loanType}` : "/finance/apply";

  useEffect(() => {
    setPageMeta({
      title: "Auto Loan Marketplace — Motorcart.in",
      description: "Compare EMI, eligibility & offers from SBI, HDFC, ICICI, Axis, NBFCs and more.",
    });
  }, []);

  return (
    <FinanceSubpageShell
      title="Bank offers & tools"
      subtitle="14 banks & NBFCs · ranked by EMI, rate & approval. EMI calculator, eligibility & CIBIL tools included."
      loanType={loanType}
    >
      <FinanceSubpageQuickLinks active="offers" loanType={loanType} />

      <FeaturedPartnerBanksStrip applyHref={applyHref} compact />

      <div className="finance-offers-banner mb-6 mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Building2 className="h-5 w-5 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          {loanType ? (
            <>
              Offers for <strong className="text-foreground">{financeCategoryLabel(loanType)}</strong>
            </>
          ) : (
            <>
              All products — browse on{" "}
              <Link to="/finance" className="font-medium text-primary hover:underline">
                Finance hub
              </Link>
            </>
          )}
        </p>
        <Button size="sm" className="w-full rounded-lg shadow-[var(--shadow-primary)] sm:ml-auto sm:w-auto" asChild>
          <Link to={applyHref}>
            Apply <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2">
        {(["offers", "tools"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              tab === t
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-primary)]"
                : "border border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            {t === "offers" ? "Multi-bank offers" : "Finance tools"}
          </button>
        ))}
      </nav>

      <section className="finance-compare-params premium-vehicle-card mb-6 grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 md:p-5">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Loan amount
          </Label>
          <Input
            type="number"
            className="mt-1.5"
            value={loanAmount}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
          />
          <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(loanAmount)}</p>
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tenure (months)
          </Label>
          <Input
            type="number"
            className="mt-1.5"
            value={tenureMonths}
            onChange={(e) => setTenureMonths(Number(e.target.value))}
          />
        </div>
      </section>

      {tab === "tools" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <EmiCalculatorWidget defaultAmount={loanAmount} defaultTenure={tenureMonths} />
          <EligibilityChecker onResult={setEligibility} />
          <CibilEstimatorPanel />
          <RefinancePanel />
        </div>
      ) : (
        <div className="space-y-8">
          <AiRecommendationPanel recommendations={recommendations} />
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              Ranked offers
            </h2>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {offers.map((o) => (
                  <BankOfferCard key={o.slug} offer={o} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </FinanceSubpageShell>
  );
}
