import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { formatCurrency, cn } from "@/lib/utils";
import { useFinanceMarketplace } from "../hooks/useFinanceMarketplace";
import { PRODUCT_RULES, type LoanProduct } from "../lib/rate-card";
import { financeApplyPath, financeOffersPath } from "../lib/finance-hub-routes";
import type { FinanceHubCategoryId } from "../data/finance-hub-categories";
import { CibilBandSelect } from "./RateCardBits";

const QUOTE_PRODUCTS: { id: FinanceHubCategoryId; product: LoanProduct; label: string; maxAmount: number; step: number }[] = [
  { id: "new-car-loan", product: "new_car", label: "New car", maxAmount: 5000000, step: 50000 },
  { id: "used-car-loan", product: "used_car", label: "Used car", maxAmount: 3000000, step: 25000 },
  { id: "bike-loan", product: "two_wheeler", label: "Bike", maxAmount: 500000, step: 5000 },
  { id: "commercial-loan", product: "commercial", label: "Commercial", maxAmount: 7500000, step: 100000 },
  { id: "ev-loan", product: "ev", label: "EV", maxAmount: 5000000, step: 50000 },
];

export function FinanceHubQuoteCard() {
  const [active, setActive] = useState(QUOTE_PRODUCTS[0]);
  const { offers, loanAmount, tenureMonths, setLoanAmount, setTenureMonths, eligibility, setEligibility } =
    useFinanceMarketplace(active.id);
  const best = offers[0];
  const maxTenure = PRODUCT_RULES[active.product].maxTenureMonths;
  const tenureStep = maxTenure <= 48 ? 6 : 12;

  return (
    <div className="fin-quote-card">
      <div className="fin-quote-card__tabs" role="tablist" aria-label="Loan type">
        {QUOTE_PRODUCTS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === active.id}
            onClick={() => setActive(p)}
            className={cn("fin-quote-card__tab", p.id === active.id && "fin-quote-card__tab--active")}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Loan amount</span>
            <strong className="text-base text-foreground">{formatCurrency(loanAmount)}</strong>
          </div>
          <input
            type="range"
            className="fin-range mt-2"
            min={active.step * 2}
            max={active.maxAmount}
            step={active.step}
            value={Math.min(loanAmount, active.maxAmount)}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
            aria-label="Loan amount"
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Tenure</span>
            <strong className="text-base text-foreground">
              {tenureMonths} months <span className="text-xs font-normal text-muted-foreground">({(tenureMonths / 12).toFixed(1)} yrs)</span>
            </strong>
          </div>
          <input
            type="range"
            className="fin-range mt-2"
            min={12}
            max={maxTenure}
            step={tenureStep}
            value={Math.min(tenureMonths, maxTenure)}
            onChange={(e) => setTenureMonths(Number(e.target.value))}
            aria-label="Tenure in months"
          />
        </div>
        <CibilBandSelect value={eligibility.cibilScore} onChange={(cibilScore) => setEligibility({ ...eligibility, cibilScore })} />

        {best ? (
          <div className="fin-quote-card__result">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Lowest EMI for you</p>
                <p className="text-3xl font-extrabold tracking-tight text-primary">
                  {formatCurrency(best.emi)}
                  <span className="text-sm font-semibold text-muted-foreground">/mo</span>
                </p>
              </div>
              <div className="flex items-center gap-2 text-right">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{best.name}</p>
                  <p className="text-xs text-primary">~{best.effectiveRate}% p.a.</p>
                </div>
                {best.logoUrl ? (
                  <span className="partner-logo-slot shrink-0">
                    <BrandLogo src={best.logoUrl} alt={best.name} size="sm" />
                  </span>
                ) : null}
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <dt className="text-muted-foreground">Interest</dt>
                <dd className="font-semibold text-foreground">{formatCurrency(best.totalInterest)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fee + GST</dt>
                <dd className="font-semibold text-foreground">{formatCurrency(best.processingFeeAmount ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total cost</dt>
                <dd className="font-semibold text-foreground">{formatCurrency(best.totalCost ?? 0)}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            No lender matches this amount and CIBIL band — lower the amount or tenure.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button className="rounded-xl shadow-[var(--shadow-primary)]" asChild>
            <Link to={financeApplyPath(active.id)}>
              Apply <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to={financeOffersPath(active.id)}>
              Compare {offers.length} offers
            </Link>
          </Button>
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <BadgeCheck className="h-3.5 w-3.5 text-primary" />
          Soft estimate — no CIBIL enquiry, no impact on your score
        </p>
      </div>
    </div>
  );
}
