import type { DbNotification } from "@/types/database";
import { getCurrentMarketScopeKey } from "@/lib/market-scope";
import { useAuthStore } from "@/store/authStore";

function storageKey(): string {
  return `motorcart_guest_notifications:${getCurrentMarketScopeKey()}`;
}

const SEED: Omit<DbNotification, "user_id">[] = [
  {
    id: "gn1",
    title: "Welcome to Motorcart",
    message: "Search vehicles, parts, loans & auctions — all in one place.",
    type: "system",
    is_read: false,
    link: "/buy",
    metadata: {},
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

function withUserId(rows: Omit<DbNotification, "user_id">[]): DbNotification[] {
  return rows.map((r) => ({ ...r, user_id: "guest" }));
}

export function loadGuestNotifications(): DbNotification[] {
  if (useAuthStore.getState().user?.id) return [];

  try {
    const raw = localStorage.getItem(storageKey());
    if (raw) return JSON.parse(raw) as DbNotification[];
  } catch {
    /* ignore */
  }
  const seeded = withUserId(SEED);
  saveGuestNotifications(seeded);
  return seeded;
}

export function saveGuestNotifications(items: DbNotification[]) {
  localStorage.setItem(storageKey(), JSON.stringify(items.slice(0, 50)));
}

export function markGuestNotificationRead(id: string) {
  const items = loadGuestNotifications().map((n) => (n.id === id ? { ...n, is_read: true } : n));
  saveGuestNotifications(items);
}

export function markAllGuestNotificationsRead() {
  saveGuestNotifications(loadGuestNotifications().map((n) => ({ ...n, is_read: true })));
}

export function syncGuestWishlistNotification(count: number) {
  if (useAuthStore.getState().user?.id) return;

  const items = loadGuestNotifications();
  if (count === 0) return;
  const updated: DbNotification = {
    id: "gn-wishlist-count",
    user_id: "guest",
    title: `${count} vehicle${count === 1 ? "" : "s"} in wishlist`,
    message: "View your saved listings from the heart icon.",
    type: "wishlist",
    is_read: false,
    link: "/wishlist",
    metadata: { count },
    created_at: new Date().toISOString(),
  };
  const rest = items.filter((n) => n.id !== updated.id);
  saveGuestNotifications([updated, ...rest]);
}

export function pushGuestNotification(partial: Pick<DbNotification, "title" | "message" | "type" | "link">) {
  if (useAuthStore.getState().user?.id) return;

  const item: DbNotification = {
    id: `gn-${Date.now()}`,
    user_id: "guest",
    title: partial.title,
    message: partial.message,
    type: partial.type,
    is_read: false,
    link: partial.link,
    metadata: {},
    created_at: new Date().toISOString(),
  };
  saveGuestNotifications([item, ...loadGuestNotifications()]);
}

/** Call when guest scope changes (login/logout) so bell count refreshes. */
export function reloadGuestNotificationsForScope(): DbNotification[] {
  return loadGuestNotifications();
}
