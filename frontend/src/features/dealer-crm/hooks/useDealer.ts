import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ensureDealerForUser, fetchDealerByOwner } from "../services/dealer.service";
import type { DealerProfile } from "../types";

export function useDealer() {
  const { user } = useAuth();
  const [dealer, setDealer] = useState<DealerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setDealer(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let profile = await fetchDealerByOwner(user.id);
      if (!profile) {
        profile = await ensureDealerForUser(user.id, {
          fullName: user.fullName,
          email: user.email,
          city: user.city,
          state: user.state,
          role: user.role,
        });
      }
      setDealer(profile);
    } catch (e) {
      console.warn("[useDealer] load failed", e);
      setDealer(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { dealer, loading, refetch: load, user };
}
