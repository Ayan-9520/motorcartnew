import { api } from "@/lib/api/axios";

export type NotificationsOverviewDto = {
  total: number;
  unread: number;
  by_source: Record<string, { total: number; unread: number }>;
  sources: string[];
  aggregation_only: boolean;
  note?: string;
};

export type NotificationItemDto = {
  id: string;
  source: string;
  title: string;
  body: string;
  created_at: string;
  deep_link: string;
  is_read: boolean;
  native_id: string;
};

export async function fetchNotificationsOverviewApi(): Promise<NotificationsOverviewDto | null> {
  try {
    const { data } = await api.get<{ data: NotificationsOverviewDto }>("/api/notifications/overview");
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchNotificationsListApi(params?: {
  unread_only?: boolean;
  source?: string;
}): Promise<{ items: NotificationItemDto[]; total: number } | null> {
  try {
    const q = new URLSearchParams();
    if (params?.unread_only) q.set("unread_only", "true");
    if (params?.source) q.set("source", params.source);
    const { data } = await api.get<{
      data: { items: NotificationItemDto[]; total: number };
    }>(`/api/notifications/list${q.toString() ? `?${q}` : ""}`);
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function markNotificationReadApi(id: string): Promise<boolean> {
  try {
    await api.patch(`/api/notifications/${encodeURIComponent(id)}/read`);
    return true;
  } catch {
    return false;
  }
}

export async function markAllNotificationsReadApi(): Promise<boolean> {
  try {
    await api.patch("/api/notifications/read-all");
    return true;
  } catch {
    return false;
  }
}
