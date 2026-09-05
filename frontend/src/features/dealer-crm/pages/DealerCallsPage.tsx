import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Phone, PhoneMissed, Voicemail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { StatCard } from "../components/StatCard";
import { CRMDataToolbar } from "../components/CRMDataToolbar";
import { useDealerCRM } from "../hooks/useDealerCRM";
import { usePaginatedFilter } from "../hooks/usePaginatedFilter";
import { fetchTelephonyCalls } from "../services/commos.service";
import { setPageMeta } from "@/utils/seo";

const outcomeIcon: Record<string, typeof Phone> = {
  answered: Phone,
  CONNECTED: Phone,
  missed: PhoneMissed,
  NO_ANSWER: PhoneMissed,
  BUSY: PhoneMissed,
  voicemail: Voicemail,
  CALL_BACK: Phone,
  NOT_INTERESTED: PhoneMissed,
  WRONG_NUMBER: PhoneMissed,
};

export function DealerCallsPage() {
  const { calls, stats } = useDealerCRM();
  const [dialerNote, setDialerNote] = useState("Checking telephony…");

  useEffect(() => {
    setPageMeta({ title: "Call logs" });
    void fetchTelephonyCalls()
      .then((res) => {
        if (res?.message) setDialerNote(res.message);
        else setDialerNote("No calls yet");
      })
      .catch((e: { response?: { data?: { message?: string } } }) => {
        setDialerNote(e.response?.data?.message ?? "Provider not configured");
      });
  }, []);

  const answered = calls.filter((c) => c.outcome === "answered").length;
  const missed = calls.filter((c) => c.outcome === "missed").length;

  const { query, setQuery, page, setPage, pageItems, totalPages, totalCount, resetPage } = usePaginatedFilter(
    calls,
    (c, q) => {
      const s = q.toLowerCase();
      return c.leadName.toLowerCase().includes(s) || c.phone.includes(s);
    },
    10
  );

  return (
    <DealerConsoleShell
      title="Call logs"
      description="Track answered, missed and voicemail calls linked to CRM leads."
      crumbs={[{ label: "Calls" }]}
      actions={
        <Button variant="outline" size="sm" className="rounded-xl" asChild>
          <Link to="/dashboard/dealer/leads">Log from lead panel</Link>
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground">{dialerNote}. Telephony is separate from WhatsApp. Successful calls are never simulated.</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Calls tracked" value={stats.callsTracked} icon={Phone} />
        <StatCard label="Answered" value={answered} icon={Phone} trend="up" />
        <StatCard label="Missed" value={missed} icon={PhoneMissed} />
      </div>

      <CRMDataToolbar
        search={query}
        onSearchChange={(v) => {
          setQuery(v);
          resetPage();
        }}
        searchPlaceholder="Search lead or number…"
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
      />

      <div className="dealer-os-card space-y-3">
        {pageItems.map((c) => {
          const Icon = outcomeIcon[c.outcome] ?? Phone;
          return (
            <article key={c.id} className="dealer-call-row">
              <span className="dealer-notification-icon">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.leadName}</p>
                <p className="text-sm text-muted-foreground">{c.phone}</p>
              </div>
              <div className="text-right shrink-0">
                <Badge variant="outline" className="capitalize">
                  {c.outcome}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : "—"} ·{" "}
                  {new Date(c.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
              <Button size="sm" variant="ghost" asChild>
                <a href={`tel:${c.phone}`}>
                  <Phone className="h-4 w-4" />
                </a>
              </Button>
            </article>
          );
        })}
        {!pageItems.length && (
          <p className="text-center text-muted-foreground py-10">
            <Plus className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No calls yet — open a lead in CRM to log outcomes. Provider calls require a configured telephony adapter.
          </p>
        )}
      </div>
    </DealerConsoleShell>
  );
}
