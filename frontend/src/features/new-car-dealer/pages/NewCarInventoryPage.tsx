import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileSpreadsheet, Plus, Upload } from "lucide-react";
import { featureFlags } from "@/config/feature-flags";
import { Button } from "@/components/ui/button";
import { NewCarDealerShell } from "../components/NewCarDealerShell";
import { NcdInventoryGrid } from "../components/NcdInventoryGrid";
import { NewCarAddInventoryDialog } from "../components/NewCarAddInventoryDialog";
import { NewCarDailyStockDialog } from "../components/NewCarDailyStockDialog";
import { useNewCarDealerOS } from "../hooks/useNewCarDealerOS";
import { useAuthStore } from "@/store/authStore";
import { setPageMeta } from "@/utils/seo";

export function NewCarInventoryPage() {
  const { data, loading, refresh, dealer } = useNewCarDealerOS();
  const user = useAuthStore((s) => s.user);
  const [addOpen, setAddOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);

  useEffect(() => {
    setPageMeta({ title: "New car inventory" });
  }, []);

  return (
    <NewCarDealerShell
      title="Showroom inventory"
      description="Variants, pricing, stock health, offers & delivery timelines."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-xl" variant="secondary" asChild>
            <Link to="/dashboard/new-car/inventory/bulk">
              <FileSpreadsheet className="mr-1 h-4 w-4" /> Bulk Excel upload
            </Link>
          </Button>
          {featureFlags.newCarInventoryV2 ? (
            <Button className="rounded-xl" variant="outline" disabled={!dealer?.id} onClick={() => setStockOpen(true)}>
              <Upload className="mr-1 h-4 w-4" /> Daily stock
            </Button>
          ) : null}
          <Button className="rounded-xl" disabled={!dealer?.id} onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add new car
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ncd-inventory-card h-72 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : (data?.inventory?.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
          <p className="text-base font-semibold">No new cars in stock yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload your price list (30+ models) or add vehicles one by one. Stock appears here and on{" "}
            <Link to="/buy/cars/new" className="font-medium text-primary hover:underline">
              /buy/cars/new
            </Link>
            .
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button className="rounded-xl" asChild>
              <Link to="/dashboard/new-car/inventory/bulk">
                <FileSpreadsheet className="mr-1 h-4 w-4" /> Bulk Excel upload
              </Link>
            </Button>
            <Button className="rounded-xl" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add new car
            </Button>
          </div>
        </div>
      ) : (
        <NcdInventoryGrid items={data?.inventory ?? []} onChanged={() => void refresh()} />
      )}
      {dealer?.id ? (
        <>
          <NewCarAddInventoryDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            dealerId={dealer.id}
            sellerId={user?.id}
            dealerCity={dealer.city}
            dealerState={dealer.state}
            onSaved={() => void refresh()}
          />
          <NewCarDailyStockDialog
            open={stockOpen}
            onOpenChange={setStockOpen}
            dealerId={dealer.id}
            items={data?.inventory ?? []}
            onSaved={() => void refresh()}
          />
        </>
      ) : null}
    </NewCarDealerShell>
  );
}
