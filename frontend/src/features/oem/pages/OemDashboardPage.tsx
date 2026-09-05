import { useEffect, useState } from "react";
import { DealerConsoleShell } from "@/features/dealer-crm/components/DealerConsoleShell";
import { setPageMeta } from "@/utils/seo";
import { api } from "@/lib/api/axios";

type Metrics = {
  authorizedDealers: number;
  quotations: number;
  testDrives: number;
  leads: number;
  wonOpportunities: number;
};

export function OemDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    setPageMeta({ title: "OEM console — MotorCart" });
    void api
      .get<{ data: Metrics }>("/api/oem/metrics")
      .then((res) => setMetrics(res.data.data))
      .catch(() => setMetrics({ authorizedDealers: 0, quotations: 0, testDrives: 0, leads: 0, wonOpportunities: 0 }));
  }, []);

  const cards = [
    ["Authorized dealers", metrics?.authorizedDealers ?? 0],
    ["Quotations", metrics?.quotations ?? 0],
    ["Test drives", metrics?.testDrives ?? 0],
    ["Leads", metrics?.leads ?? 0],
    ["Won opportunities", metrics?.wonOpportunities ?? 0],
  ] as const;

  return (
    <DealerConsoleShell title="OEM console" description="Network and sales visibility for authorized dealers only.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        OEM Authorized is shown only after admin verification. Catalog remains licensed feed / partner upload — not scraper-master.
      </p>
    </DealerConsoleShell>
  );
}
