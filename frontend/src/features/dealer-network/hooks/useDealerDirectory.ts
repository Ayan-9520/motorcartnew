import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MOCK_PUBLIC_DEALERS } from "../data/dealers-hub-data";
import { fetchPublicDealers } from "@/features/dealer-crm/services/dealer.service";
import { realDataOnly } from "@/config/real-data";
import type { DealerVertical, PublicDealer } from "../types";

export interface DealerDirectoryFilters {
  q: string;
  city: string;
  vertical: DealerVertical | "";
  verifiedOnly: boolean;
}

function matchesQuery(dealer: PublicDealer, q: string): boolean {
  if (!q.trim()) return true;
  const needle = q.toLowerCase();
  return (
    dealer.name.toLowerCase().includes(needle) ||
    dealer.city.toLowerCase().includes(needle) ||
    dealer.brands.some((b) => b.toLowerCase().includes(needle)) ||
    dealer.specialties.some((s) => s.toLowerCase().includes(needle))
  );
}

function filterDealers(source: PublicDealer[], filters: DealerDirectoryFilters): PublicDealer[] {
  return source.filter((d) => {
    if (filters.verifiedOnly && !d.isVerified) return false;
    if (filters.vertical && d.vertical !== filters.vertical) return false;
    if (filters.city && filters.city !== "All cities" && d.city !== filters.city) return false;
    return matchesQuery(d, filters.q);
  });
}

export function useDealerDirectory(override?: Partial<DealerDirectoryFilters>) {
  const [searchParams] = useSearchParams();
  const [dbDealers, setDbDealers] = useState<PublicDealer[]>([]);
  const [loading, setLoading] = useState(realDataOnly);

  const filters: DealerDirectoryFilters = {
    q: override?.q ?? searchParams.get("q") ?? "",
    city: override?.city ?? searchParams.get("city") ?? "",
    vertical: (override?.vertical ?? (searchParams.get("vertical") as DealerVertical | null) ?? "") as DealerVertical | "",
    verifiedOnly: override?.verifiedOnly ?? searchParams.get("verified") === "1",
  };

  useEffect(() => {
    if (!realDataOnly) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchPublicDealers()
      .then((rows) => {
        if (!cancelled) setDbDealers(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const source = realDataOnly ? dbDealers : MOCK_PUBLIC_DEALERS;

  const dealers = useMemo(
    () => filterDealers(source, filters),
    [source, filters.city, filters.q, filters.verifiedOnly, filters.vertical]
  );

  return { dealers, filters, total: source.length, loading };
}

export function getDealerBySlug(slug: string): PublicDealer | undefined {
  if (realDataOnly) return undefined;
  return MOCK_PUBLIC_DEALERS.find((d) => d.slug === slug);
}

export async function getDealerBySlugAsync(slug: string): Promise<PublicDealer | null> {
  const rows = await fetchPublicDealers();
  return rows.find((d) => d.slug === slug) ?? null;
}
