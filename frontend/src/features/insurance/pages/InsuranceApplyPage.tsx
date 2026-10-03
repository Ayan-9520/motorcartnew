import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Camera } from "lucide-react";
import { setPageMeta } from "@/utils/seo";
import { formatCurrency } from "@/lib/utils";
import { InsuranceSubpageShell } from "../components/InsuranceSubpageShell";
import { InsuranceApplyForm } from "../components/InsuranceApplyForm";
import { InsuranceDisclaimer, InsurancePremiumBreakdown, InsurerMonogram } from "../components/InsuranceBits";
import { readSelectedQuote, useInsuranceQuote } from "../hooks/useInsuranceQuote";
import { parseInsuranceVehicle } from "../lib/insurance-routes";
import { assessScenario, computeInsurerQuote, findInsurer, motorPlanLabel, scenarioLabel } from "../lib/insurance-engine";

export function InsuranceApplyPage() {
  const [params] = useSearchParams();
  const vehicleType = parseInsuranceVehicle(params.get("type"));
  const insurerParam = params.get("quote");
  const { input: storedInput } = useInsuranceQuote(vehicleType);

  const selection = useMemo(() => {
    const selected = readSelectedQuote();
    const input = selected && selected.input.vehicleType === vehicleType ? selected.input : storedInput;
    const insurer = findInsurer(insurerParam ?? selected?.insurerSlug);
    if (!insurer) return null;
    const assessment = assessScenario(input);
    const quote = computeInsurerQuote(input, insurer, assessment);
    return { input, insurer, assessment, quote };
  }, [vehicleType, insurerParam, storedInput]);

  useEffect(() => {
    setPageMeta({ title: "Insurance application — Motorcart" });
  }, []);

  if (!selection || !selection.quote.available) {
    return (
      <InsuranceSubpageShell title="Checkout" subtitle="Pick an insurer from the quote list first" vehicleType={vehicleType}>
        <Link to={`/insurance/quote?type=${vehicleType}`} className="font-semibold text-primary">
          Get quotes
        </Link>
      </InsuranceSubpageShell>
    );
  }

  const { input, insurer, assessment, quote } = selection;

  return (
    <InsuranceSubpageShell
      title="Complete your application"
      subtitle={`${insurer.shortName} · ${motorPlanLabel(input.planType, input.scenario, input.vehicleType)} · ${scenarioLabel(input.scenario)}`}
      vehicleType={vehicleType}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-5">
        <aside className="min-w-0 space-y-4 lg:col-span-2">
          <article className="ins-checkout-summary">
            <div className="mb-4 flex items-center gap-3">
              <InsurerMonogram name={insurer.shortName} />
              <div className="min-w-0">
                <p className="font-bold">{insurer.name}</p>
                <p className="text-sm text-muted-foreground">
                  {input.make} {input.model} · {input.city}
                </p>
              </div>
            </div>
            <p className="text-3xl font-bold text-primary">{formatCurrency(quote.totalPremium)}</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Indicative, incl. GST{quote.idv ? ` · IDV ${formatCurrency(quote.idv)}` : ""} · {insurer.claimSettlementRatio}% claims settled
            </p>
            <InsurancePremiumBreakdown quote={quote} compact />
          </article>
          {assessment.inspectionRequired && (
            <p className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
              <Camera className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              {assessment.inspectionReason}
            </p>
          )}
          <InsuranceDisclaimer />
          <Link to={`/insurance/quote?type=${vehicleType}`} className="block text-sm font-semibold text-primary">
            ← Change vehicle, plan or insurer
          </Link>
        </aside>
        <div className="ins-panel min-w-0 lg:col-span-3">
          <InsuranceApplyForm input={input} insurer={insurer} quote={quote} assessment={assessment} />
        </div>
      </div>
    </InsuranceSubpageShell>
  );
}
