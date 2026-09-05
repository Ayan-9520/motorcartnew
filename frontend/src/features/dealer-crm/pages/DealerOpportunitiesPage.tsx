import { useEffect, useState } from "react";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { setPageMeta } from "@/utils/seo";
import { fetchPipeline } from "../services/sales-os.service";

export function DealerOpportunitiesPage() {
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Opportunities" });
    void fetchPipeline()
      .then((d) => setTotal(d.total))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load opportunities"));
  }, []);

  return (
    <DealerConsoleShell
      title="Opportunities"
      description="Active commercial pursuits. Open the pipeline board for stages."
      crumbs={[{ label: "Opportunities" }]}
    >
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-sm text-muted-foreground">{total} open pipeline records. Use Pipeline for stage columns.</p>
    </DealerConsoleShell>
  );
}
