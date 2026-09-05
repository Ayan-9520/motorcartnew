import { useEffect, useState } from "react";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { fetchLeadCredits } from "../services/sales-os.service";
import { setPageMeta } from "@/utils/seo";

export function DealerCreditsPage() {
  const [data, setData] = useState<{ available?: number; used?: number; ledger?: Array<Record<string, unknown>> }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Lead credits" });
    void fetchLeadCredits()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Credits unavailable"));
  }, []);

  return (
    <DealerConsoleShell title="Lead credits" description="Ledger-backed balances. Top-up creates a payment record; credits post only after admin/server confirmation." crumbs={[{ label: "Credits" }]}>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-sm">Available: {data.available ?? 0} · Used: {data.used ?? 0}</p>
      <div className="dealer-os-card space-y-2">
        {(data.ledger ?? []).length === 0 && <p className="text-center text-muted-foreground py-10">No ledger rows</p>}
        {(data.ledger ?? []).map((row) => (
          <p key={String(row.id)} className="text-sm">
            {String(row.entryType)} {String(row.amount)} · {String(row.reason)} · balance {String(row.balanceAfter)}
          </p>
        ))}
      </div>
    </DealerConsoleShell>
  );
}
