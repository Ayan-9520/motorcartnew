import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { acquireLeadBoardItem, fetchLeadBoard } from "../services/sales-os.service";
import { setPageMeta } from "@/utils/seo";
import { featureFlags } from "@/config/feature-flags";

export function DealerLeadBoardPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const locked = !featureFlags.leadBoard;

  const load = () => {
    setError(null);
    void fetchLeadBoard()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Lead Board unavailable"));
  };

  useEffect(() => {
    setPageMeta({ title: "Lead Board" });
    if (!locked) load();
  }, [locked]);

  if (locked) {
    return (
      <DealerConsoleShell
        title="Lead Board"
        description="This feature is unavailable in your current environment."
        crumbs={[{ label: "Lead Board" }]}
      >
        <p className="text-sm text-muted-foreground py-10 text-center">
          Lead Board is locked. Enable the backend + frontend flag and your dealer entitlement to access.
        </p>
      </DealerConsoleShell>
    );
  }

  return (
    <DealerConsoleShell
      title="Lead Board"
      description="Only published listings. Customer identity is masked until you acquire with credits."
      crumbs={[{ label: "Lead Board" }]}
    >
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm">{message}</p>}
      <div className="dealer-os-card space-y-3">
        {rows.length === 0 && !error && <p className="text-center text-muted-foreground py-10">No listings available</p>}
        {rows.map((r) => (
          <article key={String(r.id)} className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-0">
            <div>
              <p className="font-medium">{String(r.customer)} · {String(r.vehicle_interest ?? "Vehicle")}</p>
              <p className="text-xs text-muted-foreground">
                {String(r.phone)} · PIN {String(r.pincode ?? "—")} · {String(r.quality)} · {String(r.sharing_mode)} · {String(r.credit_cost)} credits
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                void acquireLeadBoardItem(String(r.id))
                  .then(() => {
                    setMessage("Lead acquired.");
                    load();
                  })
                  .catch((e) => setError(e instanceof Error ? e.message : "Acquire failed"));
              }}
            >
              Acquire
            </Button>
          </article>
        ))}
      </div>
    </DealerConsoleShell>
  );
}
