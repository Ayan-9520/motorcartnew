import { useAuthStore } from "@/store/authStore";

const GUEST_SCOPE_KEY = "motorcart_guest_scope_v1";

/** Stable per-browser guest id (not shared across logged-in users). */
export function getOrCreateGuestScopeId(): string {
  try {
    let id = localStorage.getItem(GUEST_SCOPE_KEY);
    if (!id) {
      id = `guest-${crypto.randomUUID()}`;
      localStorage.setItem(GUEST_SCOPE_KEY, id);
    }
    return id;
  } catch {
    return "guest-anonymous";
  }
}

/** Scope key for wishlist, compare, recent, guest notifications. */
export function getMarketScopeKey(userId?: string | null): string {
  if (userId) return `user-${userId}`;
  return getOrCreateGuestScopeId();
}

export function getCurrentMarketScopeKey(): string {
  return getMarketScopeKey(useAuthStore.getState().user?.id);
}
