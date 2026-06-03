import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "../components/StatCard";
import { LeadTable } from "../components/LeadTable";
import { LeadPipelineBoard } from "../components/LeadPipelineBoard";
import { LeadDetailPanel } from "../components/LeadDetailPanel";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { CRMDataToolbar } from "../components/CRMDataToolbar";
import { DealerAddLeadDialog } from "../components/DealerAddLeadDialog";
import { useDealerCRM } from "../hooks/useDealerCRM";
import { useDealer } from "../hooks/useDealer";
import { usePaginatedFilter } from "../hooks/usePaginatedFilter";
import { fetchDealerMembers } from "../services/dealer-enterprise.service";
import { updateLeadStatus } from "../services/crm.service";
import type { LeadWithMeta, TeamMember } from "../types";
import type { LeadStatus } from "@/types/database";
import { setPageMeta } from "@/utils/seo";
import { Users, MessageCircle, Phone, XCircle } from "lucide-react";
import toast from "react-hot-toast";

type StageFilter = "all" | "new" | "followup" | "closed" | "lost";

function matchesStage(lead: LeadWithMeta, filter: StageFilter): boolean {
  if (filter === "all") return true;
  if (filter === "new") return lead.status === "new";
  if (filter === "followup") return lead.status === "contacted" || lead.status === "qualified";
  if (filter === "closed") return lead.status === "converted";
  return lead.status === "lost";
}

export function DealerLeadsPage() {
  const { dealer } = useDealer();
  const { leads, stats, refetch } = useDealerCRM();
  const [view, setView] = useState<"pipeline" | "table">("pipeline");
  const [selected, setSelected] = useState<LeadWithMeta | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    setPageMeta({ title: "Lead CRM" });
    if (dealer) void fetchDealerMembers(dealer.id).then(setTeam);
  }, [dealer]);

  const stageFiltered = useMemo(
    () => leads.filter((l) => matchesStage(l, stageFilter)),
    [leads, stageFilter]
  );

  const {
    query,
    setQuery,
    page,
    setPage,
    pageItems,
    totalPages,
    totalCount,
    resetPage,
  } = usePaginatedFilter(
    stageFiltered,
    (l, q) => {
      const s = q.toLowerCase();
      return (
        l.name.toLowerCase().includes(s) ||
        l.phone.includes(s) ||
        (l.vehicleInterest ?? "").toLowerCase().includes(s)
      );
    },
    12
  );

  const onStatusChange = async (id: string, status: LeadStatus) => {
    try {
      await updateLeadStatus(id, status);
      toast.success("Stage updated");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const stageFilters = [
    { value: "all", label: "All" },
    { value: "new", label: "New" },
    { value: "followup", label: "Follow-up" },
    { value: "closed", label: "Closed" },
    { value: "lost", label: "Lost" },
  ];

  return (
    <DealerConsoleShell
      title="Lead CRM"
      description="New · follow-up · closed · lost — WhatsApp, calls and notes on every lead."
      crumbs={[{ label: "Leads" }]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" className="rounded-lg" disabled={!dealer?.id} onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add lead
          </Button>
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            <Button size="sm" variant={view === "pipeline" ? "default" : "ghost"} onClick={() => setView("pipeline")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button size="sm" variant={view === "table" ? "default" : "ghost"} onClick={() => setView("table")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New leads" value={stats.newLeads} icon={Users} />
        <StatCard label="Follow-up" value={stats.followUpLeads} icon={Phone} />
        <StatCard label="Closed" value={stats.convertedLeads} icon={MessageCircle} />
        <StatCard label="Lost" value={stats.lostLeads} icon={XCircle} />
      </div>

      <CRMDataToolbar
        search={query}
        onSearchChange={(v) => {
          setQuery(v);
          resetPage();
        }}
        searchPlaceholder="Search name, phone, vehicle…"
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
        filters={stageFilters}
        activeFilter={stageFilter}
        onFilterChange={(v) => {
          setStageFilter(v as StageFilter);
          resetPage();
        }}
      />

      {view === "pipeline" ? (
        <div className="dealer-leads-layout">
          <LeadPipelineBoard
            leads={pageItems}
            selectedId={selected?.id}
            onSelect={setSelected}
            onStatusChange={(id, s) => void onStatusChange(id, s)}
          />
          <LeadDetailPanel
            lead={selected}
            dealerId={dealer?.id ?? ""}
            team={team}
            onUpdated={refetch}
          />
        </div>
      ) : (
        <LeadTable leads={pageItems} onStatusChange={(id, s) => void onStatusChange(id, s)} />
      )}
      {dealer?.id ? (
        <DealerAddLeadDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          dealerId={dealer.id}
          onSaved={() => refetch()}
        />
      ) : null}
    </DealerConsoleShell>
  );
}
