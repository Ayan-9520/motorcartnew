import { randomUUID } from "crypto";
import type {
  SocialAnalyticsHook,
  SocialChannel,
  SocialChannelId,
  SocialPublishQueueItem,
  SocialSchedule,
} from "./types";

export type SocialSchedulerState = {
  channels: SocialChannel[];
  schedules: SocialSchedule[];
  publish_queue: SocialPublishQueueItem[];
  analytics_hooks: SocialAnalyticsHook[];
};

const DEFAULT_CHANNELS: SocialChannelId[] = [
  "facebook",
  "instagram",
  "linkedin",
  "youtube",
];

function defaultChannels(): SocialChannel[] {
  return DEFAULT_CHANNELS.map((channel) => ({
    id: randomUUID(),
    channel,
    account_label: `${channel} (not connected)`,
    connected: false,
    external_account_id: null,
  }));
}

export function readSocialScheduler(metadata: unknown): SocialSchedulerState {
  const empty: SocialSchedulerState = {
    channels: defaultChannels(),
    schedules: [],
    publish_queue: [],
    analytics_hooks: [],
  };
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return empty;
  const root = metadata as Record<string, unknown>;
  const sched = root.social_scheduler;
  if (!sched || typeof sched !== "object" || Array.isArray(sched)) return empty;
  const s = sched as Partial<SocialSchedulerState>;
  return {
    channels: Array.isArray(s.channels) && s.channels.length ? s.channels : defaultChannels(),
    schedules: Array.isArray(s.schedules) ? s.schedules : [],
    publish_queue: Array.isArray(s.publish_queue) ? s.publish_queue : [],
    analytics_hooks: Array.isArray(s.analytics_hooks) ? s.analytics_hooks : [],
  };
}

export function mergeSocialScheduler(
  metadata: unknown,
  patch: Partial<SocialSchedulerState>
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const current = readSocialScheduler(base);
  return { ...base, social_scheduler: { ...current, ...patch } };
}
