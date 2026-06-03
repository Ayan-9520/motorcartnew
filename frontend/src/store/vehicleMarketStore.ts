import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { getCurrentMarketScopeKey } from "@/lib/market-scope";
import { useAuthStore } from "@/store/authStore";
import {
  addWishlistOnServer,
  fetchWishlistVehicleIds,
  removeWishlistOnServer,
} from "@/services/wishlist.service";

const MAX_COMPARE = 4;
const MAX_RECENT = 12;
const STORE_PREFIX = "motorcart-vehicle-market:";

interface VehicleMarketState {
  wishlist: string[];
  compare: string[];
  recentlyViewed: string[];
  addWishlist: (id: string) => void;
  removeWishlist: (id: string) => void;
  clearWishlist: () => void;
  toggleWishlist: (id: string) => void;
  isWishlisted: (id: string) => boolean;
  addCompare: (id: string) => boolean;
  removeCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
  addRecentlyViewed: (id: string) => void;
}

function scopedStorageKey(): string {
  return `${STORE_PREFIX}${getCurrentMarketScopeKey()}`;
}

const scopedStorage: StateStorage = {
  getItem: () => localStorage.getItem(scopedStorageKey()),
  setItem: (_name, value) => localStorage.setItem(scopedStorageKey(), value),
  removeItem: () => localStorage.removeItem(scopedStorageKey()),
};

export const useVehicleMarketStore = create<VehicleMarketState>()(
  persist(
    (set, get) => ({
      wishlist: [],
      compare: [],
      recentlyViewed: [],

      addWishlist: (id) => {
        const userId = useAuthStore.getState().user?.id;
        set((s) => {
          if (s.wishlist.includes(id)) return s;
          return { wishlist: [...s.wishlist, id] };
        });
        if (userId) void addWishlistOnServer(userId, id);
        void import("@/services/notification-guest").then(({ syncGuestWishlistNotification }) =>
          syncGuestWishlistNotification(get().wishlist.length)
        );
      },
      removeWishlist: (id) => {
        const userId = useAuthStore.getState().user?.id;
        set((s) => ({ wishlist: s.wishlist.filter((x) => x !== id) }));
        if (userId) void removeWishlistOnServer(userId, id);
      },
      clearWishlist: () => set({ wishlist: [] }),
      toggleWishlist: (id) => {
        const { wishlist } = get();
        if (wishlist.includes(id)) get().removeWishlist(id);
        else get().addWishlist(id);
      },
      isWishlisted: (id) => get().wishlist.includes(id),

      addCompare: (id) => {
        const { compare } = get();
        if (compare.includes(id)) return true;
        if (compare.length >= MAX_COMPARE) return false;
        set({ compare: [...compare, id] });
        return true;
      },
      removeCompare: (id) => set((s) => ({ compare: s.compare.filter((x) => x !== id) })),
      clearCompare: () => set({ compare: [] }),
      isInCompare: (id) => get().compare.includes(id),

      addRecentlyViewed: (id) =>
        set((s) => ({
          recentlyViewed: [id, ...s.recentlyViewed.filter((x) => x !== id)].slice(0, MAX_RECENT),
        })),
    }),
    {
      name: "motorcart-vehicle-market",
      storage: createJSONStorage(() => scopedStorage),
      partialize: (s) => ({
        wishlist: s.wishlist,
        compare: s.compare,
        recentlyViewed: s.recentlyViewed,
      }),
    }
  )
);

/** Load wishlist/compare/recent for the active user or guest scope. */
export function reloadVehicleMarketForScope() {
  try {
    let raw = localStorage.getItem(scopedStorageKey());
    if (!raw) {
      const legacy = localStorage.getItem("motorcart-vehicle-market");
      if (legacy) {
        raw = legacy;
        localStorage.setItem(scopedStorageKey(), legacy);
      }
    }
    if (!raw) {
      useVehicleMarketStore.setState({ wishlist: [], compare: [], recentlyViewed: [] });
      return;
    }
    const parsed = JSON.parse(raw) as {
      state?: { wishlist?: string[]; compare?: string[]; recentlyViewed?: string[] };
    };
    const st = parsed.state ?? parsed;
    useVehicleMarketStore.setState({
      wishlist: (st as { wishlist?: string[] }).wishlist ?? [],
      compare: (st as { compare?: string[] }).compare ?? [],
      recentlyViewed: (st as { recentlyViewed?: string[] }).recentlyViewed ?? [],
    });
  } catch {
    useVehicleMarketStore.setState({ wishlist: [], compare: [], recentlyViewed: [] });
  }
}

export async function syncWishlistWithServer(userId: string) {
  const serverIds = await fetchWishlistVehicleIds(userId);
  const local = useVehicleMarketStore.getState().wishlist;
  const merged = [...new Set([...serverIds, ...local])];
  useVehicleMarketStore.setState({ wishlist: merged });
  for (const id of local) {
    await addWishlistOnServer(userId, id);
  }
}
