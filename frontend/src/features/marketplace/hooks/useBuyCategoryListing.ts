import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useVehicleSearch } from "@/hooks/useVehicleSearch";
import { useVehicleHubStore } from "@/store/vehicleHubStore";
import { searchNewCarModelGroups } from "@/features/new-cars/services/new-cars.service";
import type { NewCarModelGroup } from "@/features/new-cars/types";
import { filtersFromSearchParams } from "@/lib/vehicle-utils";
import type { VehicleSortOption } from "@/types/vehicle";
import {
  hubCategoryToFilters,
  listingPageTitle,
  parseConditionSlug,
  parseHubCategorySlug,
} from "../lib/route-utils";
import type { HubCategorySlug, VehicleConditionSlug } from "../types";

/** Syncs /buy/:category/:condition route into vehicle search filters */
export function useBuyCategoryListing() {
  const { category: catParam, condition: condParam } = useParams<{
    category: string;
    condition: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const hub = parseHubCategorySlug(catParam);
  const condition = parseConditionSlug(condParam);

  const hubFilters = useMemo(() => {
    if (!hub || !condition) return null;
    return hubCategoryToFilters(hub, condition);
  }, [hub, condition]);

  const vehicleCategory = hubFilters?.category;
  const setBuyContext = useVehicleHubStore((s) => s.setBuyContext);

  const modelQ = searchParams.get("model");
  const variantQ = searchParams.get("variant");
  /** Flat stock rows once a model (or variant) is chosen; otherwise group by brand+model. */
  const useModelGroups =
    condition === "new" && (hub === "cars" || hub === "ev") && !modelQ && !variantQ;

  useEffect(() => {
    if (!hub || !condition) return;
    setBuyContext(hub, condition);
  }, [hub, condition, setBuyContext]);

  useEffect(() => {
    if (!hub || !condition) return;

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        let changed = false;

        if (hub === "cars") {
          const type = condition === "new" ? "new-cars" : "used-cars";
          if (next.get("type") !== type) {
            next.set("type", type);
            changed = true;
          }
          if (next.has("hub")) {
            next.delete("hub");
            changed = true;
          }
        } else if (hub === "auto" || hub === "equipment") {
          if (next.get("hub") !== hub) {
            next.set("hub", hub);
            changed = true;
          }
          if (next.has("type")) {
            next.delete("type");
            changed = true;
          }
        } else {
          if (next.get("type") !== hub) {
            next.set("type", hub);
            changed = true;
          }
          if (next.has("hub")) {
            next.delete("hub");
            changed = true;
          }
        }

        if (next.get("condition") !== condition) {
          next.set("condition", condition);
          changed = true;
        }

        if (!changed) return prev;
        next.delete("page");
        return next;
      },
      { replace: true }
    );
  }, [hub, condition, setSearchParams]);

  const resetHubFilters = () => {
    if (!hub || !condition) return;
    const next = new URLSearchParams();
    if (hub === "cars") {
      next.set("type", condition === "new" ? "new-cars" : "used-cars");
    } else if (hub === "auto" || hub === "equipment") {
      next.set("hub", hub);
    } else {
      next.set("type", hub);
    }
    next.set("condition", condition);
    setSearchParams(next, { replace: true });
  };

  const search = useVehicleSearch(vehicleCategory, { enabled: !useModelGroups });

  const [modelGroups, setModelGroups] = useState<NewCarModelGroup[]>([]);
  const [groupTotal, setGroupTotal] = useState(0);
  const [groupTotalPages, setGroupTotalPages] = useState(1);
  const [groupLoading, setGroupLoading] = useState(false);

  const sort = (searchParams.get("sort") as VehicleSortOption) || "newest";
  const page = Number(searchParams.get("page") || "1");
  const filterKey = searchParams.toString();

  const loadGroups = useCallback(async () => {
    if (!useModelGroups) return;
    setGroupLoading(true);
    try {
      const fromUrl = filtersFromSearchParams(searchParams);
      const result = await searchNewCarModelGroups({
        filters: {
          ...fromUrl,
          ...(hubFilters ?? {}),
          condition: "new",
        },
        sort,
        page,
        pageSize: 24,
      });
      setModelGroups(result.groups);
      setGroupTotal(result.total);
      setGroupTotalPages(result.totalPages);
    } finally {
      setGroupLoading(false);
    }
  }, [useModelGroups, filterKey, sort, page, hubFilters, searchParams]);

  useEffect(() => {
    if (!useModelGroups) {
      setModelGroups([]);
      return;
    }
    void loadGroups();
  }, [useModelGroups, loadGroups]);

  const title =
    hub && condition ? listingPageTitle(hub, condition) : "Vehicles";

  const switchConditionPath = (next: VehicleConditionSlug) =>
    hub ? `/buy/${hub}/${next}` : "/buy";

  const switchHubPath = (nextHub: HubCategorySlug) =>
    condition ? `/buy/${nextHub}/${condition}` : "/buy";

  return {
    hub,
    condition,
    hubFilters,
    title,
    switchConditionPath,
    switchHubPath,
    invalid: !hub || !condition,
    resetHubFilters,
    useModelGroups,
    modelGroups,
    ...search,
    ...(useModelGroups
      ? {
          vehicles: [] as typeof search.vehicles,
          total: groupTotal,
          totalPages: groupTotalPages,
          loading: groupLoading,
        }
      : {}),
  };
}
