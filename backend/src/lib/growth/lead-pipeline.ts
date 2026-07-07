import type { GrowthLeadCaptureStatus } from "@prisma/client";

export const PIPELINE_STAGES = [
  "new",
  "contacted",
  "qualified",
  "interested",
  "follow_up",
  "won",
  "lost",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type LeadNote = {
  id: string;
  text: string;
  created_at: string;
  created_by?: string | null;
};

export type LeadActivity = {
  id: string;
  type: string;
  summary: string;
  created_at: string;
  created_by?: string | null;
};

export type LeadStatusHistoryEntry = {
  from: string | null;
  to: string;
  at: string;
  by?: string | null;
};

export type LeadCrmData = {
  pipeline_stage: PipelineStage;
  source?: string | null;
  campaign?: string | null;
  assignee_user_id?: string | null;
  assignee_name?: string | null;
  follow_up_at?: string | null;
  notes: LeadNote[];
  activities: LeadActivity[];
  status_history: LeadStatusHistoryEntry[];
};

const CRM_KEY = "_crm";

export function isPipelineStage(raw: unknown): raw is PipelineStage {
  return typeof raw === "string" && PIPELINE_STAGES.includes(raw as PipelineStage);
}

export function stageToCaptureStatus(stage: PipelineStage): GrowthLeadCaptureStatus {
  if (stage === "won") return "qualified";
  if (stage === "lost") return "archived";
  return "new";
}

export function parseEventPayload(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function getLeadCrm(payload: unknown): LeadCrmData {
  const root = parseEventPayload(payload);
  const crm = parseEventPayload(root[CRM_KEY]);
  const stage = isPipelineStage(crm.pipeline_stage) ? crm.pipeline_stage : "new";
  return {
    pipeline_stage: stage,
    source: crm.source != null ? String(crm.source) : null,
    campaign: crm.campaign != null ? String(crm.campaign) : null,
    assignee_user_id: crm.assignee_user_id != null ? String(crm.assignee_user_id) : null,
    assignee_name: crm.assignee_name != null ? String(crm.assignee_name) : null,
    follow_up_at: crm.follow_up_at != null ? String(crm.follow_up_at) : null,
    notes: Array.isArray(crm.notes) ? (crm.notes as LeadNote[]) : [],
    activities: Array.isArray(crm.activities) ? (crm.activities as LeadActivity[]) : [],
    status_history: Array.isArray(crm.status_history)
      ? (crm.status_history as LeadStatusHistoryEntry[])
      : [],
  };
}

export function mergeLeadCrm(payload: unknown, patch: Partial<LeadCrmData>): Record<string, unknown> {
  const root = { ...parseEventPayload(payload) };
  const current = getLeadCrm(root);
  root[CRM_KEY] = { ...current, ...patch };
  return root;
}

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
