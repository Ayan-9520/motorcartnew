import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NewCarDealerShell } from "../components/NewCarDealerShell";
import { PRIMARY_PARTNER_BANKS } from "@/features/finance/data/primary-partner-banks";
import { setPageMeta } from "@/utils/seo";

export function NewCarFinancePage() {
  useEffect(() => setPageMeta({ title: "Finance desk" }), []);

  return (
    <NewCarDealerShell title="Finance desk" description="Loan eligibility, EMI tools and partner banks.">
      <div className="mb-4 flex flex-wrap gap-2">
        {PRIMARY_PARTNER_BANKS.map((b) => (
          <span key={b.id} className="rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium">
            {b.name}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button className="rounded-xl" asChild>
          <Link to="/finance/apply">Customer loan application</Link>
        </Button>
        <Button variant="outline" className="rounded-xl" asChild>
          <Link to="/dashboard/dealer/finance">Dealer finance desk</Link>
        </Button>
        <Button variant="outline" className="rounded-xl" asChild>
          <Link to="/finance/tools">EMI calculator</Link>
        </Button>
        <Button variant="outline" className="rounded-xl" asChild>
          <Link to="/dashboard/new-car/bookings">View bookings</Link>
        </Button>
      </div>
    </NewCarDealerShell>
  );
}
