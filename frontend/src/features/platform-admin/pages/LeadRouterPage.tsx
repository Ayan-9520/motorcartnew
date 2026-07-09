import { useQuery } from "@tanstack/react-query";
import { featureFlags } from "@/config/feature-flags";
import {
  fetchLeadRouterHistoryApi,
  fetchLeadRouterOverviewApi,
} from "@/integrations/api/lead-router";
import { SuperAdminShell } from "../components/SuperAdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function LeadRouterPage() {
  const enabled = featureFlags.leadRouter;

  const overviewQ = useQuery({
    queryKey: ["lead-router-overview"],
    queryFn: fetchLeadRouterOverviewApi,
    retry: 1,
  });

  const historyQ = useQuery({
    queryKey: ["lead-router-history"],
    queryFn: () => fetchLeadRouterHistoryApi({ limit: "50" }),
    retry: 1,
  });

  const overview = overviewQ.data;
  const history = historyQ.data?.items ?? [];

  return (
    <SuperAdminShell
      title="Unified lead router"
      description="Read-only routing layer. Does not move or modify existing Dealer, Broker, or Growth CRM leads."
    >
      {!enabled && (
        <p className="mb-4 text-xs text-muted-foreground">
          Live router API is warming up — showing available routing workspace.
        </p>
      )}
      {overviewQ.isLoading && <p className="text-sm text-muted-foreground">Loading overview…</p>}
      {overviewQ.error && (
        <p className="text-sm text-destructive">Could not load overview. Sign in as platform admin.</p>
      )}

      {overview && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard label="Routed leads (router store)" value={overview.routed_leads.total} />
            <StatCard
              label="Growth events (readonly)"
              value={Number(
                (overview.external_counts_readonly as { growth_lead_capture_events?: number })
                  .growth_lead_capture_events ?? 0
              )}
            />
            <StatCard
              label="Marketplace leads (readonly)"
              value={Number(
                (overview.external_counts_readonly as { marketplace_leads_table?: number })
                  .marketplace_leads_table ?? 0
              )}
            />
            <StatCard
              label="Dealer leads (readonly)"
              value={Number(
                (overview.external_counts_readonly as { dealer_leads_table?: number })
                  .dealer_leads_table ?? 0
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <BreakdownCard title="By source" data={overview.routed_leads.by_source} />
            <BreakdownCard title="By destination" data={overview.routed_leads.by_destination} />
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Supported sources & destinations</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {overview.sources.map((s) => (
                <Badge key={s.id} variant="outline">
                  {s.label}
                </Badge>
              ))}
              <span className="text-muted-foreground px-1">→</span>
              {overview.destinations.map((d) => (
                <Badge key={d.id} variant="secondary">
                  {d.label}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground mb-4">
            {(overview.external_counts_readonly as { note?: string }).note}
          </p>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Routing history</CardTitle>
        </CardHeader>
        <CardContent>
          {historyQ.isLoading && <p className="text-sm text-muted-foreground">Loading history…</p>}
          {!history.length && !historyQ.isLoading && (
            <p className="text-sm text-muted-foreground">No routed leads yet. Ingress via POST /api/lead-router/route.</p>
          )}
          <ul className="space-y-3 text-sm">
            {history.map((row) => {
              const r = row as Record<string, unknown>;
              const ownership = r.ownership as Record<string, unknown> | undefined;
              return (
                <li key={String(r.id)} className="border rounded-md p-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <code className="text-xs">{String(r.id)}</code>
                    <Badge variant="outline">{String(r.source)}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge>{String(r.destination)}</Badge>
                    <Badge variant="secondary">{String(r.status)}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Owner: {String(ownership?.owner_user_id ?? "—")} ·{" "}
                    {String(ownership?.entity_type ?? "")} · {String(r.created_at ?? "")}
                  </p>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </SuperAdminShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function BreakdownCard({ title, data }: { title: string; data: Record<string, number> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
