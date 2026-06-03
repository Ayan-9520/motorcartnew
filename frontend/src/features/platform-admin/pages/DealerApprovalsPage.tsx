import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { setPageMeta } from "@/utils/seo";
import { DataTable } from "@/shared/ui/data-table/DataTable";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { fetchPendingDealers, setDealerVerification } from "../services/platform-admin.service";
import type { AdminDealerRow } from "../types";
import { SuperAdminShell } from "../components/SuperAdminShell";
import { SuperAdminStatusBadge } from "../components/SuperAdminStatusBadge";

export function DealerApprovalsPage() {
  const [rows, setRows] = useState<AdminDealerRow[]>([]);

  const load = useCallback(async () => {
    setRows(await fetchPendingDealers());
  }, []);

  useEffect(() => {
    setPageMeta({ title: "Dealers — Super Admin" });
    void load();
  }, [load]);

  const act = async (id: string, status: "verified" | "rejected", ownerId?: string) => {
    const { error } = await setDealerVerification(id, status, ownerId);
    if (error) toast.error(error);
    else {
      toast.success(status === "verified" ? "Dealer approved" : "Dealer rejected");
      void load();
    }
  };

  const columns: ColumnDef<AdminDealerRow>[] = [
    { header: "Dealer", accessorKey: "name" },
    { header: "City", accessorKey: "city" },
    { header: "Plan", accessorKey: "subscriptionTier" },
    {
      header: "Verification",
      cell: ({ row }) => <SuperAdminStatusBadge status={row.original.verificationStatus} />,
    },
    {
      header: "Actions",
      cell: ({ row }) =>
        !row.original.isVerified ? (
          <div className="flex gap-1">
            <Button size="sm" onClick={() => void act(row.original.id, "verified", row.original.ownerId)}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void act(row.original.id, "rejected", row.original.ownerId)}
            >
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Verified</span>
        ),
    },
  ];

  return (
    <SuperAdminShell title="Dealer approvals" description="Verification queue, subscription tier, and storefront governance.">
      <DataTable title="Dealer directory" data={rows} columns={columns} className="sa-table-card" />
    </SuperAdminShell>
  );
}
