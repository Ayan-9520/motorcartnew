import { useEffect, useState } from "react";
import { setPageMeta } from "@/utils/seo";
import { SuperAdminShell } from "../components/SuperAdminShell";
import { fetchPayoutRules, fetchPartnerEarnings } from "@/features/commercial/commercial.service";
import { api } from "@/lib/api/axios";

export function CommercialPayoutsPage() {
  const [earnings, setEarnings] = useState<Record<string, unknown>>({});
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [csv, setCsv] = useState("");

  useEffect(() => {
    setPageMeta({ title: "Payouts — Super Admin" });
    void Promise.all([fetchPartnerEarnings(), fetchPayoutRules()])
      .then(([e, r]) => {
        setEarnings(e);
        setRules(r);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unavailable"));
  }, []);

  const preview = async () => {
    try {
      await api.post("/api/payouts/import", { fileName: "admin.csv", content: csv });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    }
  };

  return (
    <SuperAdminShell title="Payouts" description="Partner earnings, commercial rules, and bank/NBFC import preview. No silent posting.">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-sm">
        Eligible {String(earnings.totalEligible ?? 0)} · Pending {String(earnings.pending ?? 0)} · Paid {String(earnings.paid ?? 0)}
      </p>
      <h3 className="mt-4 text-sm font-semibold">Rules</h3>
      {rules.length === 0 && <p className="text-sm text-muted-foreground">No commercial rules configured.</p>}
      {rules.map((r) => (
        <p key={String(r.id)} className="text-sm">
          {String(r.product)} v{String(r.version)} share {String(r.partnerSharePercent ?? "not set")}
        </p>
      ))}
      <h3 className="mt-4 text-sm font-semibold">Bank / NBFC CSV preview</h3>
      <textarea className="w-full min-h-32 rounded border p-2 text-sm" value={csv} onChange={(e) => setCsv(e.target.value)} />
      <button type="button" className="mt-2 text-sm underline" onClick={() => void preview()}>
        Preview import
      </button>
    </SuperAdminShell>
  );
}
