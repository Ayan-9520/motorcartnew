import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPageMeta } from "@/utils/seo";
import { InsuranceSubpageShell } from "../components/InsuranceSubpageShell";
import { InsuranceVehicleToggle } from "../components/InsuranceVehicleToggle";
import { InsuranceQuoteForm } from "../components/InsuranceQuoteForm";
import { InsurancePlanCard } from "../components/InsurancePlanCard";
import { InsuranceAssessmentNotice, InsuranceDisclaimer } from "../components/InsuranceBits";
import { useInsuranceQuote } from "../hooks/useInsuranceQuote";
import { parseInsuranceScenario, parseInsuranceVehicle, vehicleTypeLabel } from "../lib/insurance-routes";
import { INSURANCE_RATES_AS_OF, MOTOR_INSURERS, scenarioLabel } from "../lib/insurance-engine";
import type { InsuranceVehicleType } from "../types";

export function InsuranceQuotePage() {
  const [params, setParams] = useSearchParams();
  const vehicleType = parseInsuranceVehicle(params.get("type"));
  const scenarioParam = parseInsuranceScenario(params.get("scenario"));
  const { input, patchInput, offers, assessment } = useInsuranceQuote(vehicleType, scenarioParam);

  useEffect(() => {
    setPageMeta({
      title: `${vehicleTypeLabel(vehicleType)} insurance quote — ${scenarioLabel(input.scenario)} | Motorcart`,
      description: "Compare motor insurance premiums from 9 insurers with IRDAI third-party rates, IDV, NCB and add-ons.",
    });
  }, [vehicleType, input.scenario]);

  const setType = (t: InsuranceVehicleType) => {
    setParams({ type: t, scenario: input.scenario }, { replace: true });
  };

  const odBlocked = input.planType === "own_damage" && !assessment.ownDamageAllowed;

  return (
    <InsuranceSubpageShell
      title="Compare motor insurance"
      subtitle={`Premiums from ${MOTOR_INSURERS.length} insurers · IRDAI third-party rates ${INSURANCE_RATES_AS_OF} · IDV, NCB, add-ons & GST calculated live.`}
      vehicleType={vehicleType}
    >
      <InsuranceVehicleToggle value={vehicleType} onChange={setType} className="mb-6" />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-2">
          <div className="ins-panel">
            <InsuranceQuoteForm input={input} onChange={patchInput} />
          </div>
        </div>
        <div className="min-w-0 space-y-4 lg:col-span-3">
          <InsuranceAssessmentNotice assessment={assessment} />
          <div className="ins-panel ins-panel--glow">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">
                {offers.length} quotes · {input.make} {input.model}
              </h2>
              <span className="text-[11px] text-muted-foreground">Sorted by total premium</span>
            </div>
            {odBlocked ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm">
                <p className="text-muted-foreground">{assessment.ownDamageReason}</p>
                <Button className="mt-3 rounded-xl" onClick={() => patchInput({ planType: "comprehensive" })}>
                  Show comprehensive plans
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {offers.map((o, i) => (
                  <InsurancePlanCard key={o.id} offer={o} input={input} rank={i + 1} featured={i === 0} />
                ))}
              </div>
            )}
            <InsuranceDisclaimer className="mt-4" />
          </div>

          <div className="ins-panel">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <ClipboardList className="h-4 w-4 text-primary" /> Documents you will need
            </h3>
            <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
              {assessment.documents.map((d) => (
                <li key={d}>• {d}</li>
              ))}
            </ul>
            <ul className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
              {assessment.steps.map((s) => (
                <li key={s}>→ {s}</li>
              ))}
            </ul>
          </div>

          {offers.length > 0 && (
            <Button variant="outline" className="w-full rounded-xl" asChild>
              <Link to={`/insurance/compare?type=${vehicleType}`}>
                Open side-by-side comparison <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </InsuranceSubpageShell>
  );
}
