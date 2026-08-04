import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { setPageMeta } from "@/utils/seo";
import { Button } from "@/components/ui/button";
import { InsuranceSubpageShell } from "../components/InsuranceSubpageShell";
import { InsuranceVehicleToggle } from "../components/InsuranceVehicleToggle";
import { insuranceQuotePath, parseInsuranceVehicle, vehicleTypeLabel } from "../lib/insurance-routes";
import type { InsuranceVehicleType } from "../types";

export function InsuranceRenewPage() {
  const [params, setParams] = useSearchParams();
  const vehicleType = parseInsuranceVehicle(params.get("type"));

  useEffect(() => {
    setPageMeta({ title: `Renew insurance — ${vehicleTypeLabel(vehicleType)}` });
  }, [vehicleType]);

  return (
    <InsuranceSubpageShell
      title="Renew policy"
      subtitle="Compare renewal premiums and retain your NCB."
      vehicleType={vehicleType}
    >
      <InsuranceVehicleToggle
        value={vehicleType}
        onChange={(t: InsuranceVehicleType) => setParams({ type: t }, { replace: true })}
        className="mb-6"
      />
      <Button className="rounded-xl" asChild>
        <Link to={insuranceQuotePath(vehicleType)}>Get renewal quote</Link>
      </Button>
    </InsuranceSubpageShell>
  );
}
