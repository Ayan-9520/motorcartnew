import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { NewCarDealerShell } from "../components/NewCarDealerShell";
import { useNewCarDealerOS } from "../hooks/useNewCarDealerOS";
import { formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";

export function NewCarBookingsPage() {
  const { data } = useNewCarDealerOS();
  useEffect(() => setPageMeta({ title: "Bookings" }), []);

  return (
    <NewCarDealerShell title="Booking management" description="Token, agreements, finance & allocation.">
      <ul className="space-y-3">
        {(data?.bookings ?? []).length === 0 ? (
          <li className="text-sm text-muted-foreground">No bookings yet — move leads to Booking stage in CRM.</li>
        ) : (
          (data?.bookings ?? []).map((b) => (
          <li key={b.id} className="ncd-list-row">
            <div>
              <p className="font-medium">{b.customerName}</p>
              <p className="text-sm text-muted-foreground">{b.vehicleLabel}</p>
            </div>
            <div className="text-right">
              <Badge variant="outline">{b.status.replace(/_/g, " ")}</Badge>
              <p className="mt-1 text-sm font-semibold">{formatCurrency(b.bookingAmount)}</p>
              <p className="text-[10px] text-muted-foreground">Token {formatCurrency(b.tokenAmount)}</p>
            </div>
          </li>
          ))
        )}
      </ul>
    </NewCarDealerShell>
  );
}
