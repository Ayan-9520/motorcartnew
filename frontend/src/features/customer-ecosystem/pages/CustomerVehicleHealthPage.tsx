import { useEffect } from "react";
import { CustomerEcosystemPage } from "../components/CustomerEcosystemPage";
import { useCustomerEcosystem } from "../hooks/useCustomerEcosystem";
import { setPageMeta } from "@/utils/seo";

export function CustomerVehicleHealthPage() {
  const { data } = useCustomerEcosystem();

  useEffect(() => {
    setPageMeta({ title: "Vehicle Health" });
  }, []);

  return (
    <CustomerEcosystemPage title="Vehicle health" description="Recorded garage health — telemetry is not connected yet.">
      <div className="grid gap-4 md:grid-cols-2">
        {(data?.vehicles ?? []).length ? (
          (data?.vehicles ?? []).map((v) => (
          <article key={v.id} className="cos-health-card">
            <img src={v.imageUrl} alt="" className="h-24 w-full rounded-xl object-cover" />
            <h3 className="font-semibold">
              {v.brand} {v.model}
            </h3>
            <div className="cos-health-score">
              <span className="text-3xl font-bold tabular-nums">{v.healthScore ?? "—"}</span>
              <span className="text-sm text-muted-foreground">/ 100 health score</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Odometer: {v.odometerKm != null ? `${v.odometerKm.toLocaleString("en-IN")} km` : "Not recorded"}</li>
              <li>Health score: {v.healthScore != null ? `${v.healthScore}/100` : "Not recorded"}</li>
              <li>Tyre/battery telemetry is not connected yet</li>
            </ul>
          </article>
          ))
        ) : (
          <p className="cos-empty md:col-span-2">Add a vehicle in your garage to see recorded health details.</p>
        )}
      </div>
    </CustomerEcosystemPage>
  );
}
