import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CustomerEcosystemPage } from "../components/CustomerEcosystemPage";
import { useCustomerEcosystem } from "../hooks/useCustomerEcosystem";
import { setPageMeta } from "@/utils/seo";

export function CustomerFastagPage() {
  const { data } = useCustomerEcosystem();
  const primary = data?.vehicles.find((v) => v.isPrimary) ?? data?.vehicles[0];
  const nhaiConnected = data?.availability.fastagProvider === true;

  useEffect(() => {
    setPageMeta({ title: "FASTag" });
  }, []);

  return (
    <CustomerEcosystemPage title="FASTag" description="Separate from MotorCart One. NHAI / issuer wallet is not connected — no live balance, recharge, or toll history.">
      <div className="cos-fastag-card max-w-lg">
        <p className="text-sm text-muted-foreground">
          {primary ? `${primary.brand} ${primary.model}` : "No vehicle linked"}
        </p>
        <p className="mt-2 text-2xl font-bold">NHAI not connected</p>
        <p className="text-xs text-muted-foreground">
          {nhaiConnected
            ? `Linked tag · ${primary?.registrationNumber ?? "Add registration in garage"}`
            : "No live FASTag balance or toll history in MotorCart."}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button className="rounded-xl" disabled>
            Recharge unavailable
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to="/dashboard/customer/garage">Manage vehicles</Link>
          </Button>
        </div>
      </div>
    </CustomerEcosystemPage>
  );
}
