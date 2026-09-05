import { useEffect, useState } from "react";
import { fetchVehiclesByIds } from "@/services/vehicle.service";
import { useVehicleMarketStore } from "@/store/vehicleMarketStore";
import type { VehicleListing } from "@/types/vehicle";

export function useWishlistVehicles() {
  const ids = useVehicleMarketStore((s) => s.wishlist);
  const [vehicles, setVehicles] = useState<VehicleListing[]>([]);
  const [missingIds, setMissingIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(ids.length > 0);

  const idsKey = ids.join(",");

  useEffect(() => {
    let cancelled = false;
    const currentIds = idsKey ? idsKey.split(",") : [];

    if (!currentIds.length) {
      setVehicles([]);
      setMissingIds([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void fetchVehiclesByIds(currentIds).then((list) => {
      if (cancelled) return;
      const resolvedKeys = new Set<string>();
      for (const v of list) {
        resolvedKeys.add(v.id);
        if (v.slug) resolvedKeys.add(v.slug);
        if (v.slug.startsWith("ncd-")) resolvedKeys.add(v.slug.slice(4));
        resolvedKeys.add(`ncd-${v.id}`);
      }
      const missing = currentIds.filter((id) => !resolvedKeys.has(id));
      setVehicles(list);
      setMissingIds(missing);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return {
    vehicles,
    missingIds,
    count: ids.length,
    readyCount: vehicles.length,
    isLoading,
    ids,
  };
}
