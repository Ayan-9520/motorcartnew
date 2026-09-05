import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { searchVehicles } from "@/services/vehicle.service";
import { searchNewCars } from "@/features/new-cars/services/new-cars.service";
import { preserveListingRouteParams } from "@/features/marketplace/lib/route-utils";
import { filtersFromSearchParams } from "@/lib/vehicle-utils";
import type { VehicleFilters, VehicleListing, VehicleSortOption } from "@/types/vehicle";
import { parseCategoryParam } from "@/lib/vehicle-utils";

const PAGE_SIZE = 12;

export function useVehicleSearch(categoryParam?: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<VehicleListing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const category = parseCategoryParam(categoryParam) ?? parseCategoryParam(searchParams.get("type") ?? undefined);
  const sort = (searchParams.get("sort") as VehicleSortOption) || "newest";
  const page = Number(searchParams.get("page") || "1");

  const filters: VehicleFilters = useMemo(() => {
    const fromUrl = filtersFromSearchParams(searchParams);
    return {
      ...fromUrl,
      category: category ?? fromUrl.category,
    };
  }, [searchParams, category]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // New cars: only dealer NewCarInventory / stock API — never invent mock or leftover used rows.
      if (filters.category === "new-cars" || filters.condition === "new") {
        const result = await searchNewCars({ filters, sort, page, pageSize: PAGE_SIZE });
        setVehicles(result.vehicles);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        return;
      }
      const result = await searchVehicles({ filters, sort, page, pageSize: PAGE_SIZE });
      setVehicles(result.vehicles);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } finally {
      setLoading(false);
    }
  }, [filters, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFilter = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const setSort = (s: VehicleSortOption) => {
    const next = new URLSearchParams(searchParams);
    next.set("sort", s);
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(p));
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams(preserveListingRouteParams(searchParams, category), { replace: true });
  };

  return {
    vehicles,
    total,
    totalPages,
    page,
    pageSize: PAGE_SIZE,
    loading,
    filters,
    sort,
    category,
    setFilter,
    setSort,
    setPage,
    clearFilters,
    searchParams,
    refetch: load,
  };
}
