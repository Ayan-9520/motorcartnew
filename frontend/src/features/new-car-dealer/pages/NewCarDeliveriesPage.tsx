import { useEffect } from "react";
import { NewCarDealerShell } from "../components/NewCarDealerShell";
import { useNewCarDealerOS } from "../hooks/useNewCarDealerOS";
import { setPageMeta } from "@/utils/seo";

export function NewCarDeliveriesPage() {
  const { data } = useNewCarDealerOS();
  useEffect(() => setPageMeta({ title: "Deliveries" }), []);

  return (
    <NewCarDealerShell title="Delivery management" description="PDI, RC, accessories & handover checklist.">
      <ul className="space-y-3">
        {(data?.deliveries ?? []).length === 0 ? (
          <li className="text-sm text-muted-foreground">No deliveries yet — mark leads as Delivered in CRM.</li>
        ) : (
          (data?.deliveries ?? []).map((d) => (
          <li key={d.id} className="ncd-list-row">
            <div>
              <p className="font-medium">{d.customerName}</p>
              <p className="text-sm text-muted-foreground">{d.vehicleLabel}</p>
            </div>
            <div className="text-right text-sm">
              <p>PDI {d.pdiComplete ? "✓" : "pending"}</p>
              <p className="text-muted-foreground">RC: {d.rcStatus}</p>
              {d.deliveryDate ? <p>{d.deliveryDate}</p> : null}
            </div>
          </li>
          ))
        )}
      </ul>
    </NewCarDealerShell>
  );
}
