import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { getMarketScopeKey } from "@/lib/market-scope";
import { reloadVehicleMarketForScope, syncWishlistWithServer } from "@/store/vehicleMarketStore";
/** When user logs in/out, load that user's own wishlist & recent — not another account's. */
export function useMarketScopeSync() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const scopeRef = useRef<string | null>(null);

  useEffect(() => {
    const scope = getMarketScopeKey(userId);
    if (scopeRef.current === scope) return;
    scopeRef.current = scope;

    reloadVehicleMarketForScope();
    if (userId) void syncWishlistWithServer(userId);
  }, [userId]);
}
