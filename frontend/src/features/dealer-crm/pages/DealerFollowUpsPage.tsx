import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { completeFollowUp, fetchFollowUps } from "../services/sales-os.service";
import { setPageMeta } from "@/utils/seo";

export function DealerFollowUpsPage() {
  const [bucket, setBucket] = useState<"overdue" | "today" | "upcoming" | "">("");
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    void fetchFollowUps(bucket || undefined)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load follow-ups"));
  };

  useEffect(() => {
    setPageMeta({ title: "Follow-ups" });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket]);

  return (
    <DealerConsoleShell title="Follow-ups" description="Dealer-scoped tasks from CRM. Empty means none due." crumbs={[{ label: "Follow-ups" }]}>
      <div className="flex gap-2">
        {(["", "overdue", "today", "upcoming"] as const).map((b) => (
          <Button key={b || "all"} size="sm" variant={bucket === b ? "default" : "outline"} onClick={() => setBucket(b)}>
            {b || "all"}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="dealer-os-card space-y-2">
        {rows.length === 0 && <p className="text-center text-muted-foreground py-10">No follow-ups</p>}
        {rows.map((t) => (
          <article key={String(t.id)} className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
            <div>
              <p className="font-medium">{String(t.title)}</p>
              <p className="text-xs text-muted-foreground">{t.dueAt ? new Date(String(t.dueAt)).toLocaleString("en-IN") : "No due date"} · {String(t.status)}</p>
            </div>
            {t.status === "pending" && (
              <Button size="sm" variant="outline" onClick={() => void completeFollowUp(String(t.id)).then(load)}>
                Complete
              </Button>
            )}
          </article>
        ))}
      </div>
    </DealerConsoleShell>
  );
}
