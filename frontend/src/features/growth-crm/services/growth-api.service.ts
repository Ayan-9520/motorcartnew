/**
 * Growth CRM REST client (J1 APIs). Active only when VITE_FEATURE_GROWTH_V2 is on.
 */
import { featureFlags } from "@/config/feature-flags";
import { hasConfiguredApi, joinApiUrl } from "@/lib/api/base-url";
import { fetchWithTimeout } from "@/lib/api/with-timeout";
import { getAccessToken } from "@/lib/api/axios";
import { useGrowthWorkspaceStore } from "@/features/growth-crm/store/growthWorkspaceStore";

export const GROWTH_WORKSPACE_HEADER = "x-growth-workspace-id";

export type GrowthApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };

export function isGrowthApiEnabled(): boolean {
  return featureFlags.growthV2 && hasConfiguredApi();
}

function sliceOn(slice: keyof typeof featureFlags): boolean {
  return isGrowthApiEnabled() && Boolean(featureFlags[slice]);
}

async function growthFetch<T>(
  path: string,
  init?: RequestInit & { workspace?: boolean; slice?: keyof typeof featureFlags }
): Promise<GrowthApiResult<T>> {
  if (!isGrowthApiEnabled()) {
    return { ok: false, error: "Growth CRM is disabled", status: 404 };
  }
  if (init?.slice && !featureFlags[init.slice]) {
    return { ok: false, error: "Feature not enabled", status: 404 };
  }

  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };

  const isForm = init?.body instanceof FormData;
  if (!isForm) headers["Content-Type"] = "application/json";

  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (init?.workspace !== false) {
    const wsId = useGrowthWorkspaceStore.getState().workspaceId;
    if (wsId) headers[GROWTH_WORKSPACE_HEADER] = wsId;
  }

  try {
    const res = await fetchWithTimeout(joinApiUrl(path), { ...init, headers }, 8000);
    const json = (await res.json().catch(() => ({}))) as T & { message?: string };
    if (!res.ok) {
      return {
        ok: false,
        error: (json as { message?: string }).message ?? res.statusText,
        status: res.status,
      };
    }
    return { ok: true, data: json, status: res.status };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
      status: 0,
    };
  }
}

// --- Workspaces ---
export function fetchGrowthWorkspaces() {
  return growthFetch<{ data: Record<string, unknown>[] }>("/api/growth/workspaces", {
    slice: "growthWorkspaces",
    workspace: false,
  });
}

export function createGrowthWorkspace(body: Record<string, unknown>) {
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/workspaces", {
    method: "POST",
    body: JSON.stringify(body),
    slice: "growthWorkspaces",
    workspace: false,
  });
}

export function fetchGrowthWorkspace(id: string) {
  return growthFetch<{ data: Record<string, unknown> }>(`/api/growth/workspaces/${id}`, {
    slice: "growthWorkspaces",
    workspace: false,
  });
}

export function fetchGrowthEntitlements(workspaceId: string) {
  return growthFetch<{ data: Record<string, unknown> }>(
    `/api/growth/workspaces/${workspaceId}/entitlements`,
    { slice: "growthWorkspaces", workspace: false }
  );
}

// --- Assets ---
export function fetchGrowthAssets(kind?: string) {
  const q = kind ? `?kind=${encodeURIComponent(kind)}` : "";
  return growthFetch<{ data: Record<string, unknown>[] }>(`/api/growth/assets${q}`, {
    slice: "growthAssets",
  });
}

export function uploadGrowthAsset(file: File, kind: string, name?: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  if (name) fd.append("name", name);
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/assets", {
    method: "POST",
    body: fd,
    slice: "growthAssets",
  });
}

export function deleteGrowthAsset(id: string) {
  return growthFetch<{ deleted: boolean }>(`/api/growth/assets/${id}`, {
    method: "DELETE",
    slice: "growthAssets",
  });
}

// --- Designs ---
export function fetchGrowthDesigns() {
  return growthFetch<{ data: Record<string, unknown>[] }>("/api/growth/designs", {
    slice: "growthPosters",
  });
}

export function fetchGrowthDesign(id: string) {
  return growthFetch<{ data: Record<string, unknown> }>(`/api/growth/designs/${id}`, {
    slice: "growthPosters",
  });
}

export function createGrowthDesign(body: Record<string, unknown>) {
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/designs", {
    method: "POST",
    body: JSON.stringify(body),
    slice: "growthPosters",
  });
}

export function updateGrowthDesign(id: string, body: Record<string, unknown>) {
  return growthFetch<{ data: Record<string, unknown> }>(`/api/growth/designs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    slice: "growthPosters",
  });
}

export function exportGrowthDesign(id: string, body: Record<string, unknown>) {
  return growthFetch<{ data: Record<string, unknown> }>(`/api/growth/designs/${id}/export`, {
    method: "POST",
    body: JSON.stringify(body),
    slice: "growthPosters",
  });
}

export function fetchDesignExports(designId: string) {
  return growthFetch<{ data: Record<string, unknown>[] }>(
    `/api/growth/designs/${designId}/exports`,
    { slice: "growthPosters" }
  );
}

// --- WhatsApp ---
export function fetchWaTemplates() {
  return growthFetch<{ data: Record<string, unknown>[] }>("/api/growth/whatsapp/templates", {
    slice: "growthWhatsapp",
  });
}

export function createWaTemplate(body: Record<string, unknown>) {
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/whatsapp/templates", {
    method: "POST",
    body: JSON.stringify(body),
    slice: "growthWhatsapp",
  });
}

export function fetchContactLists() {
  return growthFetch<{ data: Record<string, unknown>[] }>(
    "/api/growth/whatsapp/contact-lists",
    { slice: "growthWhatsapp" }
  );
}

export function createContactList(body: Record<string, unknown>) {
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/whatsapp/contact-lists", {
    method: "POST",
    body: JSON.stringify(body),
    slice: "growthWhatsapp",
  });
}

export function addContactMembers(listId: string, members: { phone: string; full_name?: string }[]) {
  return growthFetch<{ data: Record<string, unknown>[] }>(
    `/api/growth/whatsapp/contact-lists/${listId}/members`,
    {
      method: "POST",
      body: JSON.stringify({ members }),
      slice: "growthWhatsapp",
    }
  );
}

export function fetchBroadcasts() {
  return growthFetch<{ data: Record<string, unknown>[] }>("/api/growth/whatsapp/broadcasts", {
    slice: "growthWhatsapp",
  });
}

export function createBroadcast(body: Record<string, unknown>) {
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/whatsapp/broadcasts", {
    method: "POST",
    body: JSON.stringify(body),
    slice: "growthWhatsapp",
  });
}

export function mockSendBroadcast(id: string) {
  return growthFetch<{ data: Record<string, unknown> }>(
    `/api/growth/whatsapp/broadcasts/${id}/send`,
    { method: "POST", slice: "growthWhatsapp" }
  );
}

// --- Leads ---
export function fetchLeadForms() {
  return growthFetch<{ data: Record<string, unknown>[] }>("/api/growth/lead-forms", {
    slice: "growthLeads",
  });
}

export function createLeadForm(body: Record<string, unknown>) {
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/lead-forms", {
    method: "POST",
    body: JSON.stringify(body),
    slice: "growthLeads",
  });
}

export function fetchLeadEvents(formId: string, params?: { status?: string }) {
  const q = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
  return growthFetch<{ data: Record<string, unknown>[] }>(
    `/api/growth/lead-forms/${formId}/events${q}`,
    { slice: "growthLeads" }
  );
}

export function patchLeadEventStatus(formId: string, eventId: string, status: string) {
  return growthFetch<{ data: Record<string, unknown> }>(
    `/api/growth/lead-forms/${formId}/events/${eventId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
      slice: "growthLeads",
    }
  );
}

// --- J4 Lead pipeline ---
export function fetchLeadPipeline(params?: Record<string, string>) {
  const q = new URLSearchParams(params ?? {}).toString();
  return growthFetch<{ data: Record<string, unknown>[] }>(
    `/api/growth/leads/pipeline${q ? `?${q}` : ""}`,
    { slice: "growthLeadPipeline" }
  );
}

export function fetchLeadAnalytics() {
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/leads/analytics", {
    slice: "growthLeadPipeline",
  });
}

export function fetchPipelineLead(eventId: string) {
  return growthFetch<{ data: Record<string, unknown> }>(`/api/growth/leads/${eventId}`, {
    slice: "growthLeadPipeline",
  });
}

export function updatePipelineLead(eventId: string, body: Record<string, unknown>) {
  return growthFetch<{ data: Record<string, unknown> }>(`/api/growth/leads/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    slice: "growthLeadPipeline",
  });
}

export function addPipelineLeadNote(eventId: string, text: string) {
  return growthFetch<{ data: Record<string, unknown> }>(`/api/growth/leads/${eventId}/notes`, {
    method: "POST",
    body: JSON.stringify({ text }),
    slice: "growthLeadPipeline",
  });
}

export function addPipelineLeadActivity(
  eventId: string,
  body: { type: string; summary: string }
) {
  return growthFetch<{ data: Record<string, unknown> }>(
    `/api/growth/leads/${eventId}/activities`,
    {
      method: "POST",
      body: JSON.stringify(body),
      slice: "growthLeadPipeline",
    }
  );
}

export const PIPELINE_STAGES = [
  "new",
  "contacted",
  "qualified",
  "interested",
  "follow_up",
  "won",
  "lost",
] as const;

// --- L1 WhatsApp provider architecture ---
export function fetchWhatsappProviderConfig() {
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/whatsapp/providers/config", {
    slice: "growthWhatsappProviders",
    workspace: false,
  });
}

export function fetchWhatsappArchitecture() {
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/whatsapp/providers", {
    slice: "growthWhatsappProviders",
  });
}

export function fetchWhatsappQueue() {
  return growthFetch<{ data: Record<string, unknown>[] }>("/api/growth/whatsapp/queue", {
    slice: "growthWhatsappProviders",
  });
}

export function enqueueWhatsappQueue(body: Record<string, unknown>) {
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/whatsapp/queue", {
    method: "POST",
    body: JSON.stringify(body),
    slice: "growthWhatsappProviders",
  });
}

export function processWhatsappQueue() {
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/whatsapp/queue", {
    method: "POST",
    body: JSON.stringify({ action: "process" }),
    slice: "growthWhatsappProviders",
  });
}

// --- L2 Social scheduler ---
export function fetchSocialSchedulerConfig() {
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/social/config", {
    slice: "growthSocialScheduler",
    workspace: false,
  });
}

export function fetchSocialChannels() {
  return growthFetch<{ data: Record<string, unknown>[] }>("/api/growth/social/channels", {
    slice: "growthSocialScheduler",
  });
}

export function fetchSocialSchedules() {
  return growthFetch<{ data: Record<string, unknown>[] }>("/api/growth/social/schedules", {
    slice: "growthSocialScheduler",
  });
}

export function createSocialSchedule(body: Record<string, unknown>) {
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/social/schedules", {
    method: "POST",
    body: JSON.stringify(body),
    slice: "growthSocialScheduler",
  });
}

export function fetchSocialPublishQueue() {
  return growthFetch<{ data: Record<string, unknown>[] }>("/api/growth/social/queue", {
    slice: "growthSocialScheduler",
  });
}

export function processSocialPublishQueue() {
  return growthFetch<{ data: Record<string, unknown> }>("/api/growth/social/queue", {
    method: "POST",
    slice: "growthSocialScheduler",
  });
}

export function fetchSocialAnalytics() {
  return growthFetch<{ data: Record<string, unknown>[] }>("/api/growth/social/analytics", {
    slice: "growthSocialScheduler",
  });
}
