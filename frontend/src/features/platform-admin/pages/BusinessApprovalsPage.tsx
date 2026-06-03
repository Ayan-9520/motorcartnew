import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { setPageMeta } from "@/utils/seo";
import { DataTable } from "@/shared/ui/data-table/DataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { ROLE_DISPLAY_NAMES } from "@/auth/ecosystem-roles";
import { getRoleDashboardPath } from "@/auth/get-role-dashboard-path";
import type { AppRole } from "@/types/database";
import {
  approveBusinessAccount,
  fetchPendingBusinessAccounts,
  rejectBusinessAccount,
} from "../services/platform-admin.service";
import type { PendingBusinessAccountRow } from "../types";
import { SuperAdminShell } from "../components/SuperAdminShell";
import { SuperAdminStatusBadge } from "../components/SuperAdminStatusBadge";

export function BusinessApprovalsPage() {
  const [rows, setRows] = useState<PendingBusinessAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await fetchPendingBusinessAccounts());
    setLoading(false);
  }, []);

  useEffect(() => {
    setPageMeta({ title: "Business approvals — Super Admin" });
    void load();
  }, [load]);

  const approve = async (id: string) => {
    const { error } = await approveBusinessAccount(id);
    if (error) toast.error(error);
    else {
      toast.success("Business account approved — user can access full workspace");
      void load();
    }
  };

  const confirmReject = async () => {
    if (!rejectId) return;
    const { error } = await rejectBusinessAccount(rejectId, rejectReason);
    if (error) toast.error(error);
    else {
      toast.success("Application rejected");
      setRejectId(null);
      setRejectReason("");
      void load();
    }
  };

  const columns: ColumnDef<PendingBusinessAccountRow>[] = [
    {
      header: "Applicant",
      cell: ({ row }) => (
        <div className="min-w-[10rem]">
          <p className="font-medium text-foreground">{row.original.fullName}</p>
          <p className="text-xs text-muted-foreground">{row.original.email ?? row.original.phone}</p>
          {row.original.companyName ? (
            <p className="text-xs text-muted-foreground">{row.original.companyName}</p>
          ) : null}
        </div>
      ),
    },
    {
      header: "Role",
      cell: ({ row }) => (
        <span className="text-xs font-medium">
          {ROLE_DISPLAY_NAMES[row.original.role as AppRole] ?? row.original.role}
        </span>
      ),
    },
    { header: "City", accessorKey: "city" },
    {
      header: "Account",
      cell: ({ row }) => <SuperAdminStatusBadge status={row.original.status} />,
    },
    {
      header: "Approval",
      cell: ({ row }) => (
        <SuperAdminStatusBadge status={row.original.approvalStatus ?? "pending"} />
      ),
    },
    {
      header: "Workspace",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {getRoleDashboardPath(row.original.role as AppRole)}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" onClick={() => void approve(row.original.id)}>
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRejectId(row.original.id)}>
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <SuperAdminShell
      title="Business account approvals"
      description="Approve dealer, DSA, parts seller, and service partner signups. Unlocks full CRM after approval."
      actions={
        <Button size="sm" variant="outline" asChild>
          <Link to="/dashboard/super-admin/roles">Role directory</Link>
        </Button>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground animate-pulse">Loading approval queue…</p>
      ) : (
        <DataTable
          title="Pending business accounts"
          data={rows}
          columns={columns}
          emptyLabel="No pending business signups — queue is clear."
          className="sa-table-card"
        />
      )}

      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>
              Applicant stays on pending screen with your reason. They can contact support to re-apply.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmReject()}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminShell>
  );
}
