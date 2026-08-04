import type { PartProduct } from "../types";

/** Empty — public site uses PostgreSQL only (`VITE_REAL_DATA_ONLY=true`). */
export const MOCK_PARTS_CATALOG: PartProduct[] = [];

export const PARTS_CATALOG_STATS = {
  total: 0,
  featured: 0,
  categories: 0,
} as const;
