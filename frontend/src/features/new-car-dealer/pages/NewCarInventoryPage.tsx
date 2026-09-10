import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileSpreadsheet, Plus, Search, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { featureFlags } from "@/config/feature-flags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewCarDealerShell } from "../components/NewCarDealerShell";
import { NcdInventoryGrid } from "../components/NcdInventoryGrid";
import { NewCarAddInventoryDialog } from "../components/NewCarAddInventoryDialog";
import { NewCarDailyStockDialog } from "../components/NewCarDailyStockDialog";
import { useNewCarDealerOS } from "../hooks/useNewCarDealerOS";
import { clearAllNewCarInventory } from "../services/new-car-dealer.service";
import { useAuthStore } from "@/store/authStore";
import { setPageMeta } from "@/utils/seo";

export function NewCarInventoryPage() {
  const user = useAuthStore((s) => s.user);
  const [addOpen, setAddOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    setPageMeta({ title: "New car inventory" });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const { data, loading, refresh, dealer } = useNewCarDealerOS({ q: debouncedQ });

  const inventory = data?.inventory ?? [];
  const totalInDb =
    data?.metrics?.find((m) => m.key === "stock")?.value ?? inventory.length;

  const onClearAll = async () => {
    if (!dealer?.id) return;
    if (
      !window.confirm(
        `Remove ALL stock from showroom and public listings? You can re-upload Excel after.`,
      )
    ) {
      return;
    }
    setClearing(true);
    const { error } = await clearAllNewCarInventory(dealer.id);
    setClearing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("All stock cleared — ready for fresh upload");
    setQuery("");
    void refresh();
  };

  return (
    <NewCarDealerShell
      title="Showroom inventory"
      description="Variants, pricing, stock health, offers & delivery timelines."
      actions={
        <div className="flex flex-wrap gap-2">
          {(inventory.length > 0 || Number(totalInDb) > 0) && !debouncedQ ? (
            <Button
              className="rounded-xl"
              variant="outline"
              disabled={clearing || !dealer?.id}
              onClick={() => void onClearAll()}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Clear all stock
            </Button>
          ) : null}
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
      {!loading || inventory.length > 0 || debouncedQ ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brand, model, variant… (e.g. Aston Martin DB12)"
              className="rounded-xl pl-9"
              aria-label="Search inventory"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {inventory.length}
            {debouncedQ ? ` match(es) for “${debouncedQ}”` : ` of ${totalInDb} cars`}
          </p>
        </div>
      ) : null}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="ncd-inventory-card h-56 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : inventory.length === 0 && !debouncedQ ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
          <p className="text-base font-semibold">No new cars in stock yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload your price list or add vehicles one by one. Stock appears here and on{" "}
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
      ) : inventory.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
          <p className="text-sm font-medium">No cars match “{debouncedQ}”</p>
          <Button type="button" variant="outline" className="mt-4 rounded-xl" onClick={() => setQuery("")}>
            Clear search
          </Button>
        </div>
      ) : (
        <NcdInventoryGrid items={inventory} onChanged={() => void refresh()} />
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
            items={inventory}
            onSaved={() => void refresh()}
          />
        </>
      ) : null}
    </NewCarDealerShell>
  );
}
