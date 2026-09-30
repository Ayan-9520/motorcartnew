import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { setPageMeta } from "@/utils/seo";
import { DataTable } from "@/shared/ui/data-table/DataTable";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";
import { fetchAdminAuctions, updateAdminAuction } from "../services/platform-admin.service";
import type { AdminAuctionRow } from "../types";
import { finalizeAuctionRpc, moderateAuction } from "@/features/auctions/services/auction.service";
import { AdminErpShell } from "../components/AdminErpShell";
import { SuperAdminStatusBadge } from "../components/SuperAdminStatusBadge";

export function AuctionApprovalsPage() {
  const [rows, setRows] = useState<AdminAuctionRow[]>([]);

  const load = useCallback(async () => {
    setRows(await fetchAdminAuctions());
  }, []);

  useEffect(() => {
    setPageMeta({ title: "Auction approvals — Admin ERP" });
    void load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await updateAdminAuction(id, { status });
    if (error) toast.error(error);
    else {
      toast.success(`Auction ${status}`);
      void load();
    }
  };

  const review = async (id: string, decision: "approve" | "reject") => {
    const r = await moderateAuction(id, decision);
    if (!r.ok) toast.error(r.error);
    else {
      toast.success(decision === "approve" ? `Approved — ${r.status === "live" ? "live now" : "scheduled"}` : "Rejected");
      void load();
    }
  };

  const hammer = async (id: string) => {
    const r = await finalizeAuctionRpc(id);
    if (!r.ok) toast.error(r.error ?? "Could not close auction");
    else {
      toast.success(r.winner_id ? "Closed — winner declared" : "Closed — reserve not met or no bids");
      void load();
    }
  };

  const toggleFeatured = async (row: AdminAuctionRow) => {
    const { error } = await updateAdminAuction(row.id, { is_featured: !row.isFeatured });
    if (error) toast.error(error);
    else void load();
  };

  const columns: ColumnDef<AdminAuctionRow>[] = [
    { header: "Lot", accessorKey: "title" },
    {
      header: "Status",
      cell: ({ row }) => <SuperAdminStatusBadge status={row.original.status} />,
    },
    {
      header: "Current bid",
      cell: ({ row }) => formatCurrency(row.original.currentBid),
    },
    { header: "Bids", accessorKey: "bidCount" },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.status === "pending" && (
            <>
              <Button size="sm" onClick={() => void review(row.original.id, "approve")}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => void review(row.original.id, "reject")}>
                Reject
              </Button>
            </>
          )}
          {row.original.status === "upcoming" && (
            <Button size="sm" onClick={() => void setStatus(row.original.id, "live")}>
              Start now
            </Button>
          )}
          {row.original.status === "live" && (
            <Button size="sm" variant="outline" onClick={() => void hammer(row.original.id)}>
              End &amp; declare winner
            </Button>
          )}
          {(row.original.status === "live" || row.original.status === "upcoming") && (
            <Button size="sm" variant="ghost" onClick={() => void toggleFeatured(row.original)}>
              {row.original.isFeatured ? "Unfeature" : "Feature"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const pending = rows.filter((r) => r.status === "pending");
  const scheduled = rows.filter((r) => r.status === "upcoming");

  return (
    <AdminErpShell
      title="Auction approvals"
      description="Approve lots, publish live auctions, and manage featured auction inventory."
      actions={
        <Button size="sm" variant="outline" asChild>
          <Link to="/dashboard/super-admin/auction-desk">Full auction desk</Link>
        </Button>
      }
    >
      <div className="erp-kpi-strip">
        <div className="erp-kpi">
          <span className="erp-kpi__label">Awaiting approval</span>
          <span className="erp-kpi__value">{pending.length}</span>
        </div>
        <div className="erp-kpi">
          <span className="erp-kpi__label">Scheduled</span>
          <span className="erp-kpi__value">{scheduled.length}</span>
        </div>
        <div className="erp-kpi">
          <span className="erp-kpi__label">Live now</span>
          <span className="erp-kpi__value">{rows.filter((r) => r.status === "live").length}</span>
        </div>
      </div>
      <DataTable title="All auctions" data={rows} columns={columns} className="sa-table-card erp-table" />
    </AdminErpShell>
  );
}
