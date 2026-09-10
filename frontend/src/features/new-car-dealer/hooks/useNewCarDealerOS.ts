import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useDealer } from "@/features/dealer-crm/hooks/useDealer";
import { fetchNewCarDealerSnapshot } from "../services/new-car-dealer.service";
import type { NewCarDealerSnapshot } from "../types";
import { getCustomerDisplayName } from "@/features/customer-ecosystem/lib/profile-utils";

export function useNewCarDealerOS(opts?: { q?: string }) {
  const user = useAuthStore((s) => s.user);
  const { dealer, loading: dealerLoading } = useDealer();
  const [data, setData] = useState<NewCarDealerSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const q = opts?.q?.trim() ?? "";

  const refresh = useCallback(async () => {
    setLoading(true);
    const name = dealer?.name ?? getCustomerDisplayName(user);
    const snap = await fetchNewCarDealerSnapshot(dealer?.id, name, { q: q || undefined, pageSize: 2000 });
    setData(snap);
    setLoading(false);
  }, [dealer?.id, dealer?.name, user, q]);

  useEffect(() => {
    if (!dealerLoading) void refresh();
  }, [refresh, dealerLoading]);

  return { data, loading, refresh, dealer, userName: getCustomerDisplayName(user) };
}
