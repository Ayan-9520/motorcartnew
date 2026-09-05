import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PiggyBank, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerInsuranceWalletPanel } from "../components/CustomerInsuranceWalletPanel";
import { CustomerInsuranceClaimsPanel } from "../components/CustomerInsuranceClaimsPanel";
import { CustomerEcosystemPage } from "../components/CustomerEcosystemPage";
import { useCustomerEcosystem } from "../hooks/useCustomerEcosystem";
import { setPageMeta } from "@/utils/seo";

export function CustomerInsuranceWalletPage() {
  const { data } = useCustomerEcosystem();
  const hasPolicies = (data?.insurance.length ?? 0) > 0;

  useEffect(() => {
    setPageMeta({ title: "Insurance Wallet" });
  }, []);

  return (
    <CustomerEcosystemPage
      title="Insurance wallet"
      description="Policies and renewals from your MotorCart records."
      actions={
        <Button variant="outline" size="sm" className="rounded-xl" asChild>
          <Link to="/dashboard/customer/insurance">Application history</Link>
        </Button>
      }
      wide
    >
      {hasPolicies ? (
        <div className="cos-insurance-savings">
          <PiggyBank className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold">Compare renewal quotes</p>
            <p className="text-sm text-muted-foreground">Use recorded policies as a starting point — quotes are not a sanction.</p>
          </div>
          <Button className="rounded-xl shrink-0" asChild>
            <Link to="/insurance/compare">
              <Shield className="mr-1 h-4 w-4" /> Compare plans
            </Link>
          </Button>
        </div>
      ) : (
        <div className="cos-empty">
          <p>No insurance policies on file yet.</p>
          <Button className="rounded-xl" asChild>
            <Link to="/insurance/compare">Get a quote</Link>
          </Button>
        </div>
      )}

      <CustomerInsuranceWalletPanel policies={data?.insurance ?? []} />

      <section className="mt-8 space-y-3">
        <h3 className="font-semibold">Claim history</h3>
        <p className="text-xs text-muted-foreground">Claims are not stored in MotorCart yet.</p>
        <CustomerInsuranceClaimsPanel claims={[]} />
      </section>
    </CustomerEcosystemPage>
  );
}
