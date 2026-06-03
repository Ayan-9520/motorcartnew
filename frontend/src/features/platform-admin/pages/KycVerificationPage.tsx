import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { setPageMeta } from "@/utils/seo";
import { DataTable } from "@/shared/ui/data-table/DataTable";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { fetchKycQueue, reviewKycUser } from "../services/platform-admin.service";
import type { KycQueueRow } from "../types";
import { SuperAdminShell } from "../components/SuperAdminShell";
import { SuperAdminStatusBadge } from "../components/SuperAdminStatusBadge";

export function KycVerificationPage() {
  const [rows, setRows] = useState<KycQueueRow[]>([]);

  const load = async () => setRows(await fetchKycQueue());

  useEffect(() => {
    setPageMeta({ title: "KYC — Super Admin" });
    void load();
  }, []);

  const review = async (userId: string, action: "verified" | "rejected") => {
    const { error } = await reviewKycUser(userId, action);
    if (error) toast.error(error);
    else {
      toast.success(`KYC ${action}`);
      void load();
    }
  };

  const columns: ColumnDef<KycQueueRow>[] = [
    { header: "Name", accessorKey: "fullName" },
    { header: "Email", accessorKey: "email" },
    { header: "Role", accessorKey: "role" },
    {
      header: "Status",
      cell: ({ row }) => <SuperAdminStatusBadge status={row.original.kycStatus} />,
    },
    {
      header: "Submitted",
      cell: ({ row }) => new Date(row.original.submittedAt).toLocaleDateString("en-IN"),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="sm" onClick={() => void review(row.original.userId, "verified")}>
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => void review(row.original.userId, "rejected")}>
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <SuperAdminShell title="KYC verification" description="Identity and business document review — updates users.kyc_status via admin API.">
      <DataTable title="Review queue" data={rows} columns={columns} className="sa-table-card" />
    </SuperAdminShell>
  );
}
