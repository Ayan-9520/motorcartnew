import { useEffect, useState } from "react";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { setPageMeta } from "@/utils/seo";
import { fetchPipeline } from "../services/sales-os.service";

export function DealerPipelinePage() {
  const [data, setData] = useState<{ columns: Array<{ stage: string; items: Array<{ id: string; lead?: { name?: string; vehicleInterest?: string | null; quality?: string; source?: string | null } }> }>; total: number }>({
    columns: [],
    total: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Sales pipeline" });
    void fetchPipeline()
      .then((d) => setData(d as typeof data))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load pipeline"));
  }, []);

  return (
    <DealerConsoleShell title="Sales pipeline" description="Real opportunities only. Empty columns mean no deals in that stage." crumbs={[{ label: "Pipeline" }]}>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-sm text-muted-foreground">{data.total} opportunities</p>
      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
        {data.columns.map((col) => (
          <section key={col.stage} className="dealer-os-card min-h-[12rem] space-y-2">
            <h2 className="text-sm font-semibold">{col.stage.replace("_", " ")}</h2>
            {col.items.length === 0 && <p className="text-xs text-muted-foreground">No cards</p>}
            {col.items.map((item) => (
              <article key={item.id} className="rounded-lg border p-2 text-sm">
                <p className="font-medium">{item.lead?.name ?? "Opportunity"}</p>
                <p className="text-muted-foreground">{item.lead?.vehicleInterest ?? "—"}</p>
                <p className="text-xs">{item.lead?.quality} · {item.lead?.source ?? "—"}</p>
              </article>
            ))}
          </section>
        ))}
      </div>
    </DealerConsoleShell>
  );
}
