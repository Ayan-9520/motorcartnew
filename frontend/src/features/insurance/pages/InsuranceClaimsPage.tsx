import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { setPageMeta } from "@/utils/seo";
import { Button } from "@/components/ui/button";
import { InsuranceSubpageShell } from "../components/InsuranceSubpageShell";
import { InsuranceVehicleToggle } from "../components/InsuranceVehicleToggle";
import { parseInsuranceVehicle, vehicleTypeLabel } from "../lib/insurance-routes";
import type { InsuranceVehicleType } from "../types";

export function InsuranceClaimsPage() {
  const [params, setParams] = useSearchParams();
  const vehicleType = parseInsuranceVehicle(params.get("type"));

  useEffect(() => {
    setPageMeta({ title: `Insurance claims — ${vehicleTypeLabel(vehicleType)}` });
  }, [vehicleType]);

  return (
    <InsuranceSubpageShell
      title="Claims support"
      subtitle="Track cashless claims, upload documents, and connect with your insurer."
      vehicleType={vehicleType}
    >
      <InsuranceVehicleToggle
        value={vehicleType}
        onChange={(t: InsuranceVehicleType) => setParams({ type: t }, { replace: true })}
        className="mb-6"
      />
      <p className="text-sm text-muted-foreground">
        Claims workflow connects to your policy vault — sign in to view active policies.
      </p>
      <Button className="mt-4 rounded-xl" asChild>
        <Link to="/login?redirect=/dashboard/customer/insurance">Sign in to continue</Link>
      </Button>
    </InsuranceSubpageShell>
  );
}
