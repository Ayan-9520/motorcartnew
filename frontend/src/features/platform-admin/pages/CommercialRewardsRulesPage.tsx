import { useEffect, useState } from "react";
import { setPageMeta } from "@/utils/seo";
import { SuperAdminShell } from "../components/SuperAdminShell";
import { api } from "@/lib/api/axios";

export function CommercialRewardsRulesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Reward rules — Super Admin" });
    void api
      .get<{ data?: Array<Record<string, unknown>> }>("/api/rewards/rules")
      .then((r) => setRows(r.data?.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Unavailable"));
  }, []);

  return (
    <SuperAdminShell title="Reward rules" description="Only active admin-configured rules can earn points. No MotorCart One card in this batch.">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No reward rules.</p>}
      {rows.map((r) => (
        <p key={String(r.id)} className="text-sm">
          {String(r.code)} · {String(r.source)} · {String(r.points)} pts · {r.active ? "active" : "inactive"}
        </p>
      ))}
    </SuperAdminShell>
  );
}
