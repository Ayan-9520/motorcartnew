import { useEffect } from "react";
import { Link } from "react-router-dom";
import { DEFAULT_SERVICE_BOOK_PATH } from "@/features/service-booking/lib/service-book-routes";
import { Button } from "@/components/ui/button";
import { CustomerEcosystemPage } from "../components/CustomerEcosystemPage";
import { useCustomerEcosystem } from "../hooks/useCustomerEcosystem";
import { setPageMeta } from "@/utils/seo";

export function CustomerServiceRecordsPage() {
  const { data } = useCustomerEcosystem();

  useEffect(() => {
    setPageMeta({ title: "Service Records" });
  }, []);

  return (
    <CustomerEcosystemPage
      title="Service records"
      description="Garage visits, spend & next due dates."
      actions={
        <Button size="sm" className="rounded-xl" asChild>
          <Link to={DEFAULT_SERVICE_BOOK_PATH}>Book service</Link>
        </Button>
      }
    >
      {(data?.serviceRecords ?? []).length ? (
      <ul className="space-y-3">
        {(data?.serviceRecords ?? []).map((s) => (
          <li key={s.id} className="cos-service-row">
            <div>
              <p className="font-medium">{s.serviceType}</p>
              <p className="text-sm text-muted-foreground">
                {s.vehicleLabel} · {s.serviceCenter}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(s.servicedAt).toLocaleDateString("en-IN")}
                {s.nextDueDate ? ` · Next due ${new Date(s.nextDueDate).toLocaleDateString("en-IN")}` : ""}
              </p>
            </div>
            {s.amount != null ? <p className="font-semibold tabular-nums">₹{s.amount.toLocaleString("en-IN")}</p> : null}
          </li>
        ))}
      </ul>
      ) : (
        <div className="cos-empty">
          <p>No service records yet.</p>
          <Button className="rounded-xl" asChild>
            <Link to={DEFAULT_SERVICE_BOOK_PATH}>Book a service</Link>
          </Button>
        </div>
      )}
    </CustomerEcosystemPage>
  );
}
