import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GrowthLoadingState } from "@/features/growth-crm/components/GrowthLoadingState";
import {
  fetchLeadEvents,
  fetchLeadForms,
  patchLeadEventStatus,
} from "@/features/growth-crm/services/growth-api.service";
import { Button } from "@/components/ui/button";

const STATUSES = ["", "new", "qualified", "spam", "archived"] as const;

export function GrowthLeadDetailPage() {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    const [formsRes, eventsRes] = await Promise.all([
      fetchLeadForms(),
      fetchLeadEvents(formId, statusFilter ? { status: statusFilter } : undefined),
    ]);
    if (formsRes.ok) {
      const f = (formsRes.data.data ?? []).find((x) => String(x.id) === formId);
      setForm(f ?? null);
    }
    if (eventsRes.ok) setEvents(eventsRes.data.data ?? []);
    setLoading(false);
  }, [formId, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => JSON.stringify(e.payload ?? {}).toLowerCase().includes(q));
  }, [events, search]);

  if (loading) return <GrowthLoadingState rows={5} />;

  return (
    <div className="space-y-6">
      <Link to="/dashboard/growth/leads" className="text-sm text-muted-foreground hover:text-foreground">
        ← Lead forms
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{form ? String(form.name) : "Lead form"}</h1>
        {form ? (
          <p className="text-sm text-muted-foreground mt-1">Slug: {String(form.slug)}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <Label>Search payload</Label>
          <Input
            placeholder="Name, phone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <Label>Status</Label>
          <select
            className="h-10 rounded-md border px-3 text-sm min-w-[140px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>
                {s || "All"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads match your filters.</p>
          ) : (
            filtered.map((e) => (
              <Card
                key={String(e.id)}
                className={`p-3 cursor-pointer ${selected?.id === e.id ? "border-primary" : ""}`}
                onClick={() => setSelected(e)}
              >
                <div className="flex justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(String(e.created_at)).toLocaleString()}
                  </p>
                  <Badge variant="secondary">{String(e.status)}</Badge>
                </div>
                <p className="text-sm mt-2 line-clamp-2">
                  {JSON.stringify(e.payload ?? {}).slice(0, 120)}
                </p>
              </Card>
            ))
          )}
        </div>

        <Card className="p-4 min-h-[200px]">
          <h2 className="font-medium text-sm mb-3">Lead detail</h2>
          {selected ? (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {STATUSES.filter(Boolean).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={String(selected.status) === s ? "default" : "outline"}
                    onClick={() =>
                      void patchLeadEventStatus(formId!, String(selected.id), s).then(() => load())
                    }
                  >
                    {s}
                  </Button>
                ))}
              </div>
              <pre className="text-xs overflow-auto whitespace-pre-wrap bg-muted/50 rounded p-3">
                {JSON.stringify(selected, null, 2)}
              </pre>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a lead to view payload.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
