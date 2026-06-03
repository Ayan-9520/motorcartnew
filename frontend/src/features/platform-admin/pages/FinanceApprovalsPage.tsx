import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { setPageMeta } from "@/utils/seo";
import { DataTable } from "@/shared/ui/data-table/DataTable";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import type { FinanceStatus } from "@/types/database";
import {
  fetchFinanceApplications,
  updateFinanceApplicationStatus,
} from "../services/platform-admin.service";
import type { AdminFinanceApplicationRow } from "../types";
import { SuperAdminShell } from "../components/SuperAdminShell";
import { SuperAdminStatusBadge } from "../components/SuperAdminStatusBadge";

const TABS: { label: string; status?: FinanceStatus }[] = [
  { label: "Queue", status: "submitted" },
  { label: "Processing", status: "processing" },
  { label: "Approved", status: "approved" },
  { label: "All" },
];

export function FinanceApprovalsPage() {
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState<AdminFinanceApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const status = TABS[tab]?.status;
    setRows(await fetchFinanceApplications(status));
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    setPageMeta({ title: "Fintech approvals — Super Admin" });
    void load();
  }, [load]);

  const setStatus = async (id: string, status: FinanceStatus) => {
    const { error } = await updateFinanceApplicationStatus(id, status);
    if (error) toast.error(error);
    else {
      toast.success(`Loan marked ${status}`);
      void load();
    }
  };

  const columns: ColumnDef<AdminFinanceApplicationRow>[] = [
    {
      id: "applicationId",
      header: "Application ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.id.slice(0, 8)}…</span>
      ),
    },
    {
      id: "applicant",
      header: "Applicant",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.applicantName}</p>
          <p className="text-xs text-muted-foreground">{row.original.applicantEmail}</p>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-mono text-sm">₹{row.original.amount.toLocaleString("en-IN")}</span>
      ),
    },
    { id: "tenure", header: "Tenure", cell: ({ row }) => `${row.original.tenure} mo` },
    {
      id: "submitted",
      header: "Submitted",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("en-IN"),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <SuperAdminStatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <div className="flex flex-wrap gap-1">
            {(s === "submitted" || s === "draft") && (
              <Button size="sm" onClick={() => void setStatus(row.original.id, "processing")}>
                Process
              </Button>
            )}
            {(s === "submitted" || s === "processing") && (
              <>
                <Button size="sm" onClick={() => void setStatus(row.original.id, "approved")}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => void setStatus(row.original.id, "rejected")}>
                  Reject
                </Button>
              </>
            )}
            {s === "approved" && (
              <Button size="sm" onClick={() => void setStatus(row.original.id, "disbursed")}>
                Disburse
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <SuperAdminShell
      title="Fintech & loan approvals"
      description="Review finance applications from marketplace → processing → approved → disbursed."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <Button
            key={t.label}
            size="sm"
            variant={tab === i ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setTab(i)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground animate-pulse">Loading applications…</p>
      ) : (
        <DataTable
          title="Finance applications"
          data={rows}
          columns={columns}
          emptyLabel="No applications in this stage."
          className="sa-table-card"
        />
      )}
    </SuperAdminShell>
  );
}
