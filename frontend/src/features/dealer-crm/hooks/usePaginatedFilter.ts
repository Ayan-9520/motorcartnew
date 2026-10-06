import { useMemo, useState } from "react";

export function usePaginatedFilter<T>(
  items: T[],
  filterFn: (item: T, query: string) => boolean,
  pageSize = 8
) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const list = items.filter((item) => filterFn(item, query));
    return list;
  }, [items, query, filterFn]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const resetPage = () => setPage(1);

  return {
    query,
    setQuery,
    page: safePage,
    setPage,
    statusFilter,
    setStatusFilter,
    filtered,
    pageItems,
    totalPages,
    totalCount: filtered.length,
    resetPage,
  };
}
