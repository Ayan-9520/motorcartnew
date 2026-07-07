import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  mergeSocialScheduler,
  readSocialScheduler,
} from "@/lib/growth/social-scheduler/store";
import type { SocialChannelId, SocialSchedule } from "@/lib/growth/social-scheduler/types";

export function getSocialSchedulerConfig() {
  return {
    live_api_enabled: false,
    supported_channels: ["facebook", "instagram", "linkedin", "youtube"],
    queue: { backend: "workspace_metadata", processor: "stub" },
    analytics: { hooks_enabled: true, data_source: "placeholder" },
  };
}

async function loadWorkspace(workspaceId: string) {
  return prisma.growthWorkspace.findFirst({
    where: { id: workspaceId, status: { not: "archived" } },
  });
}

async function persist(workspaceId: string, state: ReturnType<typeof readSocialScheduler>) {
  const ws = await loadWorkspace(workspaceId);
  if (!ws) return null;
  const metadata = mergeSocialScheduler(ws.metadata, state);
  return prisma.growthWorkspace.update({
    where: { id: workspaceId },
    data: { metadata: metadata as Prisma.InputJsonValue },
  });
}

export async function getSocialSchedulerState(workspaceId: string) {
  const ws = await loadWorkspace(workspaceId);
  if (!ws) return null;
  return readSocialScheduler(ws.metadata);
}

export async function listSocialChannels(workspaceId: string) {
  const state = await getSocialSchedulerState(workspaceId);
  return state?.channels ?? null;
}

export async function createSocialSchedule(
  workspaceId: string,
  data: {
    channel_id: string;
    title: string;
    body: string;
    media_urls?: string[];
    scheduled_at: string;
  }
) {
  const ws = await loadWorkspace(workspaceId);
  if (!ws) return null;
  const state = readSocialScheduler(ws.metadata);
  const channel = state.channels.find((c) => c.id === data.channel_id);
  if (!channel) return null;

  const now = new Date().toISOString();
  const schedule: SocialSchedule = {
    id: randomUUID(),
    channel_id: data.channel_id,
    title: data.title,
    body: data.body,
    media_urls: data.media_urls ?? [],
    scheduled_at: data.scheduled_at,
    status: "scheduled",
    created_at: now,
    updated_at: now,
  };

  const queueItem = {
    id: randomUUID(),
    schedule_id: schedule.id,
    channel: channel.channel as SocialChannelId,
    position: state.publish_queue.length,
    status: "queued" as const,
    enqueued_at: now,
  };

  await persist(workspaceId, {
    ...state,
    schedules: [schedule, ...state.schedules].slice(0, 200),
    publish_queue: [queueItem, ...state.publish_queue].slice(0, 200),
  });

  return schedule;
}

export async function listSocialSchedules(workspaceId: string) {
  const state = await getSocialSchedulerState(workspaceId);
  return state?.schedules ?? null;
}

export async function listPublishQueue(workspaceId: string) {
  const state = await getSocialSchedulerState(workspaceId);
  return state?.publish_queue ?? null;
}

/** Stub publish — marks schedule published, records analytics placeholder */
export async function processPublishQueueStub(workspaceId: string, limit = 5) {
  const ws = await loadWorkspace(workspaceId);
  if (!ws) return null;

  let state = readSocialScheduler(ws.metadata);
  const pending = state.publish_queue.filter((q) => q.status === "queued").slice(0, limit);
  const now = new Date().toISOString();

  for (const item of pending) {
    state = {
      ...state,
      publish_queue: state.publish_queue.map((q) =>
        q.id === item.id ? { ...q, status: "published" } : q
      ),
      schedules: state.schedules.map((s) =>
        s.id === item.schedule_id
          ? { ...s, status: "published", updated_at: now }
          : s
      ),
      analytics_hooks: [
        {
          schedule_id: item.schedule_id,
          channel: item.channel,
          impressions: null,
          clicks: null,
          engagement_rate: null,
          placeholder: true as const,
        },
        ...state.analytics_hooks,
      ].slice(0, 200),
    };
  }

  await persist(workspaceId, state);
  return { processed: pending.length };
}

export async function getSocialAnalyticsHooks(workspaceId: string) {
  const state = await getSocialSchedulerState(workspaceId);
  return state?.analytics_hooks ?? null;
}
