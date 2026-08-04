import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { setPageMeta } from "@/utils/seo";
import { DataTable } from "@/shared/ui/data-table/DataTable";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { api } from "@/lib/api/axios";
import { SuperAdminShell } from "../components/SuperAdminShell";
import { SuperAdminStatusBadge } from "../components/SuperAdminStatusBadge";

type MarketplaceLeadRow = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  source?: string | null;
  status: string;
  dealer_id?: string;
  dealer_name?: string | null;
  vehicle_title?: string | null;
  vehicle_interest?: string | null;
  created_at?: string;
  notes?: string | null;
};

const STATUSES = ["new", "contacted", "qualified", "converted", "lost"] as const;

async function fetchMarketplaceLeads(): Promise<MarketplaceLeadRow[]> {
  const { data } = await api.get<{ data?: MarketplaceLeadRow[] }>("/api/leads", {
    params: { limit: 150 },
  });
  return data.data ?? [];
}

async function patchLeadStatus(id: string, status: string): Promise<void> {
  await api.patch(`/api/leads/${id}`, { status });
}

export function MarketplaceLeadsPage() {
  const [rows, setRows] = useState<MarketplaceLeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchMarketplaceLeads());
    } catch {
      toast.error("Could not load marketplace leads");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPageMeta({ title: "Marketplace leads — Super Admin" });
    void load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    try {
      await patchLeadStatus(id, status);
      toast.success(`Lead marked ${status}`);
      void load();
    } catch {
      toast.error("Status update failed");
    }
  };

  const columns: ColumnDef<MarketplaceLeadRow>[] = [
    {
      header: "Customer",
      cell: ({ row }) => (
        <div className="min-w-[9rem]">
          <p className="font-medium text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.phone}</p>
          {row.original.email ? (
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          ) : null}
        </div>
      ),
    },
    {
      header: "Vehicle",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.vehicle_title || row.original.vehicle_interest || "—"}
        </span>
      ),
    },
    {
      header: "Dealer desk",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.dealer_name || row.original.dealer_id || "—"}</span>
      ),
    },
    {
      header: "Source",
      cell: ({ row }) => (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {row.original.source || "website"}
        </span>
      ),
    },
    {
      header: "Status",
      cell: ({ row }) => <SuperAdminStatusBadge status={row.original.status} />,
    },
    {
      header: "Created",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.created_at ? new Date(row.original.created_at).toLocaleString("en-IN") : "—"}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <select
          value={row.original.status}
          onChange={(e) => void setStatus(row.original.id, e.target.value)}
          className="h-8 w-[8.5rem] rounded-md border border-border bg-background px-2 text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <SuperAdminShell
      title="Marketplace leads"
      description="Live enquiries from website + Motorcart app. Same Postgres leads table as Dealer OS. Update status here or on the dealer desk."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Flow: App/Website enquire → dealer CRM + this inbox.{" "}
          <Link to="/dashboard/super-admin/lead-router" className="font-medium text-primary hover:underline">
            Lead router (counts)
          </Link>
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>
      <DataTable
        title={loading ? "Loading leads…" : `${rows.length} marketplace leads`}
        data={rows}
        columns={columns}
        className="sa-table-card"
      />
    </SuperAdminShell>
  );
}
