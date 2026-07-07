import { useEffect, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { featureFlags } from "@/config/feature-flags";
import { Button } from "@/components/ui/button";
import { NewCarDealerShell } from "../components/NewCarDealerShell";
import { NcdInventoryGrid } from "../components/NcdInventoryGrid";
import { NewCarAddInventoryDialog } from "../components/NewCarAddInventoryDialog";
import { NewCarDailyStockDialog } from "../components/NewCarDailyStockDialog";
import { useNewCarDealerOS } from "../hooks/useNewCarDealerOS";
import { setPageMeta } from "@/utils/seo";

export function NewCarInventoryPage() {
  const { data, loading, refresh, dealer } = useNewCarDealerOS();
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
      ) : (
        <NcdInventoryGrid items={data?.inventory ?? []} />
      )}
      {dealer?.id ? (
        <>
          <NewCarAddInventoryDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            dealerId={dealer.id}
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
