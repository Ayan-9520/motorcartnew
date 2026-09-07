import { useEffect, useState } from "react";
import { api } from "@/lib/api/axios";
import { withApiTimeout } from "@/lib/api/with-timeout";
import { fetchPublicDealerBySlug } from "@/features/dealer-crm/services/dealer-enterprise.service";

type PublicShowroom = NonNullable<Awaited<ReturnType<typeof fetchPublicDealerBySlug>>>;

async function fetchShowroomApi(slug: string): Promise<PublicShowroom | null> {
  try {
    const { data } = await withApiTimeout(
      api.get<{
        dealer: PublicShowroom["dealer"];
        storefront: PublicShowroom["storefront"];
        vehicles: PublicShowroom["vehicles"];
        reviews: PublicShowroom["reviews"];
      }>(`/api/dealers/${encodeURIComponent(slug)}`, { timeout: 12000 }),
      12000,
    );
    if (!data?.dealer) return null;
    return {
      dealer: data.dealer,
      storefront: data.storefront ?? null,
      vehicles: data.vehicles ?? [],
      reviews: data.reviews ?? [],
    };
  } catch (e) {
    console.warn("[usePublicDealer] dedicated API failed, falling back", e);
    return fetchPublicDealerBySlug(slug);
  }
}

export function usePublicDealer(slug: string | undefined) {
  const [data, setData] = useState<PublicShowroom | null>(null);
  const [loading, setLoading] = useState(Boolean(slug));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const d = await fetchShowroomApi(slug);
        if (cancelled) return;
        setData(d);
      } catch (e) {
        if (cancelled) return;
        console.warn("[usePublicDealer]", e);
        setData(null);
        setError(e instanceof Error ? e.message : "Failed to load showroom");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { data, loading, error };
}
