import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVehicleMarketStore } from "@/store/vehicleMarketStore";
import { fetchVehiclesByIds } from "@/services/vehicle.service";
import type { VehicleListing } from "@/types/vehicle";

export function CompareFloatingBar() {
  const { compare, removeCompare, clearCompare } = useVehicleMarketStore();
  const [items, setItems] = useState<VehicleListing[]>([]);
  const compareKey = compare.join("|");

  useEffect(() => {
    if (!compare.length) {
      setItems([]);
      return;
    }
    let cancelled = false;
    void fetchVehiclesByIds(compare).then((list) => {
      if (!cancelled) setItems(list);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareKey]);

  if (!compare.length) return null;

  return (
    <div className="marketplace-compare-bar fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 items-center gap-3 rounded-2xl border border-primary/20 bg-card/95 p-3 shadow-2xl backdrop-blur-md">
      <GitCompare className="h-5 w-5 shrink-0 text-primary" />
      <p className="flex-1 text-sm font-medium">{compare.length} selected for compare</p>
      <div className="hidden gap-1 sm:flex">
        {items.slice(0, 3).map((v) => (
          <span key={v!.id} className="max-w-[100px] truncate rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {v!.brand} {v!.model}
          </span>
        ))}
      </div>
      <Button variant="default" size="sm" className="rounded-lg" asChild>
        <Link to="/vehicles/compare">Compare</Link>
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearCompare}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
