import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Sparkles } from "lucide-react";
import { setPageMeta } from "@/utils/seo";
import { DataTable } from "@/shared/ui/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";
import { fetchAdminVehicles, moderateVehicle } from "../services/platform-admin.service";
import type { AdminVehicleRow } from "../types";
import { AdminErpShell } from "../components/AdminErpShell";

export function FeaturedInventoryPage() {
  const [rows, setRows] = useState<AdminVehicleRow[]>([]);

  const load = useCallback(async () => {
    const all = await fetchAdminVehicles();
    setRows(all.filter((v) => v.status === "available"));
  }, []);

  useEffect(() => {
    setPageMeta({ title: "Featured inventory — Admin ERP" });
    void load();
  }, [load]);

  const togglePlatform = async (row: AdminVehicleRow) => {
    const { error } = await moderateVehicle(row.id, {
      platform_featured: !row.platformFeatured,
      is_featured: !row.platformFeatured,
    });
    if (error) toast.error(error);
    else {
      toast.success(row.platformFeatured ? "Removed from homepage" : "Featured on marketplace");
      void load();
    }
  };

  const featured = rows.filter((r) => r.platformFeatured);

  const columns: ColumnDef<AdminVehicleRow>[] = [
    { header: "Vehicle", accessorKey: "title" },
    { header: "Dealer", accessorKey: "dealerName" },
    { header: "City", accessorKey: "city" },
    {
      id: "price",
      header: "Price",
      cell: ({ row }) => formatCurrency(row.original.price),
    },
    {
      id: "featured",
      header: "Featured",
      cell: ({ row }) =>
        row.original.platformFeatured ? (
          <Badge className="bg-primary/15 text-primary">
            <Sparkles className="h-3 w-3 mr-1" /> Live
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button size="sm" variant={row.original.platformFeatured ? "outline" : "default"} onClick={() => void togglePlatform(row.original)}>
          {row.original.platformFeatured ? "Unfeature" : "Feature"}
        </Button>
      ),
    },
  ];

  return (
    <AdminErpShell
      title="Featured inventory"
      description="Curate homepage and marketplace hero slots — platform-wide featured vehicles."
    >
      <div className="erp-kpi-strip">
        <div className="erp-kpi">
          <span className="erp-kpi__label">Featured live</span>
          <span className="erp-kpi__value">{featured.length}</span>
        </div>
        <div className="erp-kpi">
          <span className="erp-kpi__label">Available pool</span>
          <span className="erp-kpi__value">{rows.length}</span>
        </div>
      </div>
      <DataTable title="Available listings" data={rows} columns={columns} className="sa-table-card erp-table" />
    </AdminErpShell>
  );
}
