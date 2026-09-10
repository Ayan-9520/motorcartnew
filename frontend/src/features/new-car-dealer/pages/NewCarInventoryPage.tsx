import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileSpreadsheet, Plus, Search, Upload } from "lucide-react";
import { featureFlags } from "@/config/feature-flags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [query, setQuery] = useState("");

  useEffect(() => {
    setPageMeta({ title: "New car inventory" });
  }, []);

  const inventory = data?.inventory ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter((v) => {
      const hay = [v.brand, v.model, v.variant, v.fuelType, v.transmission, ...(v.colors ?? [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [inventory, query]);

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
      {!loading && inventory.length > 0 ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brand, model, variant, colour…"
              className="rounded-xl pl-9"
              aria-label="Search inventory"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {inventory.length} cars
          </p>
        </div>
      ) : null}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="ncd-inventory-card h-56 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : inventory.length === 0 ? (
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
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
          <p className="text-sm font-medium">No cars match “{query.trim()}”</p>
          <Button type="button" variant="outline" className="mt-4 rounded-xl" onClick={() => setQuery("")}>
            Clear search
          </Button>
        </div>
      ) : (
        <NcdInventoryGrid items={filtered} onChanged={() => void refresh()} />
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
