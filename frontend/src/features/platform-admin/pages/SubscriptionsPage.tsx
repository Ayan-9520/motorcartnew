import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { setPageMeta } from "@/utils/seo";
import { DataTable } from "@/shared/ui/data-table/DataTable";
import { SuperAdminShell } from "../components/SuperAdminShell";
import { fetchManagedPlans } from "@/features/commercial/commercial.service";

type PlanRow = { id: string; name: string; slug: string; price: string; billingCycle: string; status: string };

export function SubscriptionsPage() {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Subscriptions — Super Admin" });
    void fetchManagedPlans()
      .then((plans) =>
        setRows(
          plans.map((p) => ({
            id: String(p.id),
            name: String(p.name),
            slug: String(p.slug),
            price: String(p.price),
            billingCycle: String(p.billingCycle ?? ""),
            status: String(p.status ?? ""),
          })),
        ),
      )
      .catch((e) => setError(e instanceof Error ? e.message : "Unavailable"));
  }, []);

  const columns: ColumnDef<PlanRow>[] = [
    { header: "Plan", accessorKey: "name" },
    { header: "Slug", accessorKey: "slug" },
    { header: "Price", accessorKey: "price" },
    { header: "Cycle", accessorKey: "billingCycle" },
    { header: "Status", accessorKey: "status" },
  ];

  return (
    <SuperAdminShell title="Subscriptions" description="Admin-configured partner plans from PostgreSQL. Empty until a plan is created.">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DataTable title="Subscription plans" data={rows} columns={columns} className="sa-table-card" />
    </SuperAdminShell>
  );
}
