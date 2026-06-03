import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from "@/services/notification.service";
import {
  loadGuestNotifications,
  markAllGuestNotificationsRead,
  markGuestNotificationRead,
} from "@/services/notification-guest";
import type { DbNotification } from "@/types/database";

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems(loadGuestNotifications());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchNotifications(user.id);
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    if (!user?.id) return;
    return subscribeNotifications(user.id, load);
  }, [load, user?.id]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const markRead = useCallback(
    async (id: string) => {
      if (!user?.id) {
        markGuestNotificationRead(id);
        setItems(loadGuestNotifications());
        return;
      }
      try {
        await markNotificationRead(id);
        await load();
      } catch {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      }
    },
    [user?.id, load]
  );

  const markAllRead = useCallback(async () => {
    if (!user?.id) {
      markAllGuestNotificationsRead();
      setItems(loadGuestNotifications());
      return;
    }
    try {
      await markAllNotificationsRead(user.id);
      await load();
    } catch {
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  }, [user?.id, load]);

  return {
    notifications: items,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refetch: load,
  };
}
