import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { setPageMeta } from "@/utils/seo";
import { Button } from "@/components/ui/button";
import { InsuranceSubpageShell } from "../components/InsuranceSubpageShell";
import { InsuranceVehicleToggle } from "../components/InsuranceVehicleToggle";
import { InsuranceCompareTable } from "../components/InsuranceCompareTable";
import { InsuranceDisclaimer } from "../components/InsuranceBits";
import { useInsuranceQuote } from "../hooks/useInsuranceQuote";
import { parseInsuranceVehicle, vehicleTypeLabel } from "../lib/insurance-routes";
import { motorPlanLabel, scenarioLabel } from "../lib/insurance-engine";
import type { InsuranceVehicleType } from "../types";

export function InsuranceComparePage() {
  const [params, setParams] = useSearchParams();
  const vehicleType = parseInsuranceVehicle(params.get("type"));
  const { input, offers, assessment } = useInsuranceQuote(vehicleType);

  useEffect(() => {
    setPageMeta({ title: `Compare insurance — ${vehicleTypeLabel(vehicleType)}` });
  }, [vehicleType]);

  return (
    <InsuranceSubpageShell
      title="Compare insurers"
      subtitle="Side-by-side IDV, own damage, add-ons, IRDAI third party, claim settlement ratio and cashless garages."
      vehicleType={vehicleType}
    >
      <InsuranceVehicleToggle
        value={vehicleType}
        onChange={(t: InsuranceVehicleType) => setParams({ type: t }, { replace: true })}
        className="mb-6"
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">
            {input.make} {input.model}
          </strong>{" "}
          · {scenarioLabel(input.scenario)} · {motorPlanLabel(input.planType, input.scenario, input.vehicleType)} · {input.city} · NCB{" "}
          {assessment.ncbPercent}%
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/insurance/quote?type=${vehicleType}`}>Edit vehicle & plan</Link>
        </Button>
      </div>
      <InsuranceCompareTable offers={offers} input={input} />
      <InsuranceDisclaimer className="mt-4" />
    </InsuranceSubpageShell>
  );
}
