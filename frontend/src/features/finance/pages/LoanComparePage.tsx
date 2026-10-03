import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { setPageMeta } from "@/utils/seo";
import { useFinanceMarketplace } from "../hooks/useFinanceMarketplace";
import { LoanComparisonTable } from "../components/LoanComparisonTable";
import { AiRecommendationPanel } from "../components/AiRecommendationPanel";
import { FinanceSubpageShell } from "../components/FinanceSubpageShell";
import { FinanceSubpageQuickLinks } from "../components/FinanceSubpageQuickLinks";
import { financeCategoryLabel, parseFinanceType } from "../lib/finance-hub-routes";
import { PRODUCT_RULES } from "../lib/rate-card";
import { CibilBandSelect, RateCardNote } from "../components/RateCardBits";

export function LoanComparePage() {
  const [params] = useSearchParams();
  const loanType = parseFinanceType(params.get("type"));
  const {
    offers,
    recommendations,
    product,
    loanAmount,
    tenureMonths,
    setLoanAmount,
    setTenureMonths,
    eligibility,
    setEligibility,
  } = useFinanceMarketplace(loanType);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const label = loanType ? financeCategoryLabel(loanType) : "Auto Loan";
    setPageMeta({ title: `Compare ${label} — Motorcart.in` });
  }, [loanType]);

  const toggle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length < 4 ? [...prev, slug] : prev
    );
  };

  const compared = offers.filter((o) => selected.length === 0 || selected.includes(o.slug));
  const applyHref = loanType ? `/finance/apply?type=${loanType}` : "/finance/apply";

  return (
    <FinanceSubpageShell
      title="Compare lenders"
      subtitle="Select up to 4 lenders side-by-side. Rates are priced for your CIBIL band; total cost includes processing fee + GST."
      loanType={loanType}
    >
      <FinanceSubpageQuickLinks active="compare" loanType={loanType} />

      <Card className="finance-compare-params premium-vehicle-card mb-6 overflow-hidden">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-3 md:p-5">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Loan amount (₹)
            </Label>
            <Input
              type="number"
              className="mt-1.5"
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
            />
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
            <p className="mt-1 text-xs text-muted-foreground">
              Max {PRODUCT_RULES[product].maxTenureMonths} months
            </p>
          </div>
          <CibilBandSelect
            value={eligibility.cibilScore}
            onChange={(cibilScore) => setEligibility({ ...eligibility, cibilScore })}
          />
        </CardContent>
      </Card>
      <RateCardNote className="mb-6" />

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <aside className="lg:col-span-1">
          <AiRecommendationPanel recommendations={recommendations} />
        </aside>
        <div className="lg:col-span-2">
          <LoanComparisonTable offers={compared} selectedSlugs={selected} onToggle={toggle} />
        </div>
      </div>

      <Button
        variant="default"
        className="h-12 rounded-xl px-8 text-base font-semibold shadow-[var(--shadow-primary)]"
        asChild
      >
        <Link to={applyHref}>
          Apply with best offer <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </FinanceSubpageShell>
  );
}
