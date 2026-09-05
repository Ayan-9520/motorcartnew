import { useEffect, useState } from "react";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { createPayoutRequest, fetchPartnerEarnings } from "@/features/commercial/commercial.service";
import { setPageMeta } from "@/utils/seo";

export function DealerEarningsPage() {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const entries = (data.entries as Array<Record<string, unknown>> | undefined) ?? [];

  useEffect(() => {
    setPageMeta({ title: "Earnings" });
    void fetchPartnerEarnings()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Unavailable"));
  }, []);

  const request = async () => {
    const ids = entries.filter((e) => e.status === "APPROVED").map((e) => String(e.id));
    if (!ids.length) return;
    await createPayoutRequest(ids);
    setData(await fetchPartnerEarnings());
  };

  return (
    <DealerConsoleShell title="Earnings" description="Eligible payouts from approved records only. No estimated commissions." crumbs={[{ label: "Earnings" }]}>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-sm">
        Eligible {String(data.totalEligible ?? 0)} · Pending {String(data.pending ?? 0)} · Approved {String(data.approved ?? 0)} · In progress {String(data.inProgress ?? 0)} · Paid {String(data.paid ?? 0)} · Hold {String(data.rejectedHold ?? 0)} · Adj {String(data.adjustment ?? 0)}
      </p>
      <button type="button" className="text-sm underline" onClick={() => void request()}>
        Request payout for approved entries
      </button>
      <div className="dealer-os-card space-y-2">
        {entries.length === 0 && <p className="text-center text-muted-foreground py-10">No earnings</p>}
        {entries.map((row) => (
          <p key={String(row.id)} className="text-sm">
            {String(row.product ?? row.sourceType)} · {String(row.amount)} · {String(row.status)}
          </p>
        ))}
      </div>
    </DealerConsoleShell>
  );
}
