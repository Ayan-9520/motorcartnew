import { useCallback, useEffect, useState } from "react";
import { fetchVehicleBySlug, searchVehicles } from "@/services/vehicle.service";
import { searchNewCars } from "@/features/new-cars/services/new-cars.service";
import type { VehicleListing } from "@/types/vehicle";
import { getSimilarVehicles } from "@/lib/vehicle-utils";
import { useVehicleMarketStore } from "@/store/vehicleMarketStore";
import { MOCK_VEHICLES } from "@/data/vehicle-catalog";

/** New cars compare against live showroom stock; used/other listings against the same condition. */
async function loadSimilarPool(v: VehicleListing): Promise<VehicleListing[]> {
  if (v.condition === "new" && (v.category === "new-cars" || v.category === "ev")) {
    const byBrand = (await searchNewCars({ filters: { brand: v.brand }, pageSize: 24 })).vehicles;
    const otherModels = byBrand.filter((x) => x.id !== v.id && x.model !== v.model);
    if (otherModels.length >= 4) return byBrand;
    const general = (await searchNewCars({ pageSize: 24 })).vehicles;
    return [...byBrand, ...general];
  }
  return (await searchVehicles({ filters: { condition: v.condition }, sort: "newest", page: 1, pageSize: 100 })).vehicles;
}

function onePerModel(list: VehicleListing[], current: VehicleListing): VehicleListing[] {
  const seen = new Set<string>([`${current.brand}|${current.model}`.toLowerCase()]);
  const out: VehicleListing[] = [];
  for (const item of list) {
    const key = `${item.brand}|${item.model}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function useVehicleDetail(slug: string | undefined) {
  const [vehicle, setVehicle] = useState<VehicleListing | null>(null);
  const [similar, setSimilar] = useState<VehicleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const addRecentlyViewed = useVehicleMarketStore((s) => s.addRecentlyViewed);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    const v = await fetchVehicleBySlug(slug);
    setVehicle(v);
    if (v) {
      addRecentlyViewed(v.id);
      let pool: VehicleListing[] = [];
      try {
        pool = await loadSimilarPool(v);
      } catch {
        pool = [];
      }
      const source = pool.length ? pool : MOCK_VEHICLES;
      const ranked = getSimilarVehicles(v, source, 24);
      const picks = v.condition === "new" ? onePerModel(ranked, v) : ranked;
      setSimilar(picks.slice(0, 4));
    }
    setLoading(false);
  }, [slug, addRecentlyViewed]);

  useEffect(() => {
    load();
  }, [load]);

  return { vehicle, similar, loading, refetch: load };
}
