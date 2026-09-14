import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { filtersFromSearchParams } from "@/lib/vehicle-utils";
import type { VehicleSortOption } from "@/types/vehicle";
import { searchNewCarModelGroups, searchNewCars } from "../services/new-cars.service";
import type { NewCarListing, NewCarModelGroup } from "../types";

const PAGE_SIZE = 12;

export function useNewCarSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<NewCarListing[]>([]);
  const [modelGroups, setModelGroups] = useState<NewCarModelGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const sort = (searchParams.get("sort") as VehicleSortOption) || "newest";
  const page = Number(searchParams.get("page") || "1");
  const modelQ = searchParams.get("model");
  const variantQ = searchParams.get("variant");
  const useModelGroups = !modelQ && !variantQ;
  const filters = { ...filtersFromSearchParams(searchParams), category: undefined as never };

  const load = useCallback(async () => {
    setLoading(true);
    if (useModelGroups) {
      const result = await searchNewCarModelGroups({ filters, sort, page, pageSize: PAGE_SIZE });
      setModelGroups(result.groups);
      setVehicles([]);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } else {
      const result = await searchNewCars({ filters, sort, page, pageSize: PAGE_SIZE });
      setVehicles(result.vehicles as NewCarListing[]);
      setModelGroups([]);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    }
    setLoading(false);
  }, [JSON.stringify(filters), sort, page, useModelGroups]);

  useEffect(() => {
    load();
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

  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  return {
    vehicles,
    modelGroups,
    useModelGroups,
    total,
    totalPages,
    page,
    loading,
    sort,
    setFilter,
    setSort,
    setPage,
    clearFilters,
    searchParams,
  };
}
