import { useCallback, useEffect, useState } from "react";
import { fetchPartBySlug, fetchPartReviews } from "../services/parts.service";
import type { PartProduct, PartReview } from "../types";

export function usePartDetail(category: string | undefined, slug: string | undefined) {
  const [part, setPart] = useState<PartProduct | null>(null);
  const [reviews, setReviews] = useState<PartReview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    const p = await fetchPartBySlug(category, slug);
    setPart(p);
    if (p) {
      setReviews(await fetchPartReviews(p.slug));
    }
    setLoading(false);
  }, [category, slug]);

  useEffect(() => {
    load();
  }, [load]);

  return { part, reviews, loading, refetch: load };
}
