import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api/axios";
import { featureFlags } from "@/config/feature-flags";
import { hasConfiguredApi } from "@/lib/api/base-url";
import type { DbNotification } from "@/types/database";

type UnifiedNotificationItem = {
  id: string;
  source: string;
  title: string;
  body: string;
  created_at: string;
  deep_link: string;
  is_read: boolean;
  native_id: string;
  metadata?: Record<string, unknown>;
};

function mapUnifiedToDb(userId: string, item: UnifiedNotificationItem): DbNotification {
  return {
    id: item.native_id || item.id,
    user_id: userId,
    title: item.title,
    message: item.body,
    type: item.source,
    is_read: item.is_read,
    link: item.deep_link,
    metadata: item.metadata ?? {},
    created_at: item.created_at,
  };
}

async function useUnifiedNotificationsApi(): Promise<boolean> {
  return featureFlags.unifiedNotifications && hasConfiguredApi();
}

export async function fetchNotifications(userId: string, limit = 50) {
  if (await useUnifiedNotificationsApi()) {
    try {
      const { data } = await api.get<{ data?: UnifiedNotificationItem[] }>("/api/notifications/list", {
        params: { limit },
      });
      return (data.data ?? []).map((item) => mapUnifiedToDb(userId, item));
    } catch {
      /* fall through */
    }
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as DbNotification[];
}

export async function markNotificationRead(id: string) {
  if (await useUnifiedNotificationsApi()) {
    try {
      await api.post(`/api/notifications/${encodeURIComponent(id)}/read`);
      return;
    } catch {
      /* fall through */
    }
  }

  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  if (await useUnifiedNotificationsApi()) {
    try {
      await api.post("/api/notifications/read-all");
      return;
    } catch {
      /* fall through */
    }
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
}

export function subscribeNotifications(userId: string, onChange: () => void) {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      () => onChange()
    )
    .subscribe();

  const pollMs = featureFlags.unifiedNotifications ? 60_000 : 0;
  const timer = pollMs ? window.setInterval(onChange, pollMs) : undefined;

  return () => {
    if (timer) window.clearInterval(timer);
    supabase.removeChannel(channel);
  };
}
