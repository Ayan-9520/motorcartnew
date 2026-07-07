export type SocialChannelId = "facebook" | "instagram" | "linkedin" | "youtube";

export type SocialChannel = {
  id: string;
  channel: SocialChannelId;
  account_label: string;
  connected: boolean;
  external_account_id: string | null;
};

export type SocialScheduleStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type SocialSchedule = {
  id: string;
  channel_id: string;
  title: string;
  body: string;
  media_urls: string[];
  scheduled_at: string;
  status: SocialScheduleStatus;
  created_at: string;
  updated_at: string;
};

export type SocialPublishQueueItem = {
  id: string;
  schedule_id: string;
  channel: SocialChannelId;
  position: number;
  status: SocialScheduleStatus;
  enqueued_at: string;
};

export type SocialAnalyticsHook = {
  schedule_id: string;
  channel: SocialChannelId;
  impressions: number | null;
  clicks: number | null;
  engagement_rate: number | null;
  placeholder: true;
};
