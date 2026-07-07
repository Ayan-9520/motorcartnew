export const NOTIFICATION_SOURCES = [
  "community",
  "auction",
  "growth",
  "lead_router",
  "directory",
  "system",
] as const;

export type NotificationSource = (typeof NOTIFICATION_SOURCES)[number];

export type UnifiedNotificationItem = {
  id: string;
  source: NotificationSource;
  title: string;
  body: string;
  created_at: string;
  deep_link: string;
  is_read: boolean;
  native_id: string;
  metadata?: Record<string, unknown>;
};
