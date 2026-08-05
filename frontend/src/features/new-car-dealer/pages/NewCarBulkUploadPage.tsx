import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkUploadZone } from "@/features/dealer-crm/components/BulkUploadZone";
import { useDealer } from "@/features/dealer-crm/hooks/useDealer";
import { useAuth } from "@/hooks/useAuth";
import { NewCarDealerShell } from "../components/NewCarDealerShell";
import { setPageMeta } from "@/utils/seo";

/** New Car OS bulk upload — same CSV as marketplace; syncs showroom + /buy/cars/new */
export function NewCarBulkUploadPage() {
  const { dealer, loading } = useDealer();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setPageMeta({ title: "Bulk new car upload" });
  }, []);

  if (loading) return <p className="text-muted-foreground p-6">Loading…</p>;
  if (!dealer) {
    return (
      <NewCarDealerShell title="Bulk upload" description="Complete dealer onboarding to upload stock.">
        <p className="text-sm text-muted-foreground">Dealer profile not found for this account.</p>
      </NewCarDealerShell>
    );
  }

  return (
    <NewCarDealerShell
      title="Bulk Excel / CSV upload"
      description="Upload your new car price list once — stock appears in Showroom inventory and on the public site (/buy/cars/new). Use KM Driven = 0 for brand-new units."
      actions={
        <Button variant="outline" size="sm" className="rounded-xl" asChild>
          <Link to="/dashboard/new-car/inventory">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to stock
          </Link>
        </Button>
      }
    >
      <BulkUploadZone
        dealer={dealer}
        sellerId={user?.id}
        onComplete={() => navigate("/dashboard/new-car/inventory", { replace: false })}
      />
    </NewCarDealerShell>
  );
}
