import type { GrowthLeadCaptureStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getLeadCrm,
  isPipelineStage,
  mergeLeadCrm,
  newId,
  stageToCaptureStatus,
  type LeadActivity,
  type LeadCrmData,
  type LeadNote,
  type PipelineStage,
} from "@/lib/growth/lead-pipeline";

export function mapLeadEvent(row: {
  id: string;
  formId: string;
  status: GrowthLeadCaptureStatus;
  payload: unknown;
  createdAt: Date;
  ipHash: string | null;
  userAgent: string | null;
  form?: { name: string; slug: string; workspaceId: string; metadata: unknown };
}) {
  const crm = getLeadCrm(row.payload);
  const root = row.payload as Record<string, unknown>;
  const { _crm: _omit, ...leadFields } = root;
  void _omit;
  return {
    id: row.id,
    form_id: row.formId,
    status: row.status,
    pipeline_stage: crm.pipeline_stage,
    source: crm.source,
    campaign: crm.campaign,
    assignee_user_id: crm.assignee_user_id,
    assignee_name: crm.assignee_name,
    follow_up_at: crm.follow_up_at,
    notes: crm.notes,
    activities: crm.activities,
    status_history: crm.status_history,
    lead_fields: leadFields,
    created_at: row.createdAt.toISOString(),
    form: row.form
      ? {
          name: row.form.name,
          slug: row.form.slug,
          workspace_id: row.form.workspaceId,
        }
      : undefined,
  };
}

export async function listPipelineLeads(
  workspaceId: string,
  opts: {
    stage?: PipelineStage;
    assigneeUserId?: string;
    source?: string;
    campaign?: string;
    q?: string;
    limit?: number;
  }
) {
  const events = await prisma.growthLeadCaptureEvent.findMany({
    where: { form: { workspaceId } },
    include: { form: { select: { name: true, slug: true, workspaceId: true, metadata: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.limit ?? 500, 500),
  });

  const q = opts.q?.trim().toLowerCase();
  return events
    .map((e) => mapLeadEvent(e))
    .filter((row) => {
      if (opts.stage && row.pipeline_stage !== opts.stage) return false;
      if (opts.assigneeUserId && row.assignee_user_id !== opts.assigneeUserId) return false;
      if (opts.source && row.source !== opts.source) return false;
      if (opts.campaign && row.campaign !== opts.campaign) return false;
      if (q) {
        const blob = JSON.stringify(row).toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
}

export async function getPipelineLead(workspaceId: string, eventId: string) {
  const row = await prisma.growthLeadCaptureEvent.findFirst({
    where: { id: eventId, form: { workspaceId } },
    include: { form: { select: { name: true, slug: true, workspaceId: true, metadata: true } } },
  });
  if (!row) return null;
  return mapLeadEvent(row);
}

async function updateLeadPayload(
  workspaceId: string,
  eventId: string,
  build: (crm: LeadCrmData, current: Prisma.JsonValue) => Prisma.InputJsonValue
) {
  const row = await prisma.growthLeadCaptureEvent.findFirst({
    where: { id: eventId, form: { workspaceId } },
  });
  if (!row) return null;

  const crm = getLeadCrm(row.payload);
  const nextPayload = build(crm, row.payload);
  const nextCrm = getLeadCrm(nextPayload);
  const status = stageToCaptureStatus(nextCrm.pipeline_stage);

  const updated = await prisma.growthLeadCaptureEvent.update({
    where: { id: eventId },
    data: { payload: nextPayload, status },
    include: { form: { select: { name: true, slug: true, workspaceId: true, metadata: true } } },
  });
  return mapLeadEvent(updated);
}

export async function updatePipelineLead(
  workspaceId: string,
  eventId: string,
  patch: {
    pipeline_stage?: PipelineStage;
    source?: string | null;
    campaign?: string | null;
    assignee_user_id?: string | null;
    assignee_name?: string | null;
    follow_up_at?: string | null;
    actor_user_id?: string | null;
  }
) {
  return updateLeadPayload(workspaceId, eventId, (crm, current) => {
    const nextStage = patch.pipeline_stage ?? crm.pipeline_stage;
    const history = [...crm.status_history];
    if (patch.pipeline_stage && patch.pipeline_stage !== crm.pipeline_stage) {
      history.push({
        from: crm.pipeline_stage,
        to: patch.pipeline_stage,
        at: new Date().toISOString(),
        by: patch.actor_user_id ?? null,
      });
    }
    return mergeLeadCrm(current, {
      ...crm,
      pipeline_stage: nextStage,
      source: patch.source !== undefined ? patch.source : crm.source,
      campaign: patch.campaign !== undefined ? patch.campaign : crm.campaign,
      assignee_user_id:
        patch.assignee_user_id !== undefined ? patch.assignee_user_id : crm.assignee_user_id,
      assignee_name: patch.assignee_name !== undefined ? patch.assignee_name : crm.assignee_name,
      follow_up_at: patch.follow_up_at !== undefined ? patch.follow_up_at : crm.follow_up_at,
      status_history: history,
    }) as Prisma.InputJsonValue;
  });
}

export async function addLeadNote(
  workspaceId: string,
  eventId: string,
  text: string,
  createdBy?: string | null
) {
  const note: LeadNote = {
    id: newId(),
    text,
    created_at: new Date().toISOString(),
    created_by: createdBy ?? null,
  };
  return updateLeadPayload(workspaceId, eventId, (crm, current) =>
    mergeLeadCrm(current, {
      ...crm,
      notes: [note, ...crm.notes],
      activities: [
        {
          id: newId(),
          type: "note",
          summary: text.slice(0, 120),
          created_at: note.created_at,
          created_by: createdBy ?? null,
        },
        ...crm.activities,
      ],
    }) as Prisma.InputJsonValue
  );
}

export async function addLeadActivity(
  workspaceId: string,
  eventId: string,
  activity: Omit<LeadActivity, "id" | "created_at">
) {
  const row: LeadActivity = {
    id: newId(),
    created_at: new Date().toISOString(),
    ...activity,
  };
  return updateLeadPayload(workspaceId, eventId, (crm, current) =>
    mergeLeadCrm(current, {
      ...crm,
      activities: [row, ...crm.activities],
    }) as Prisma.InputJsonValue
  );
}

export async function getLeadAnalytics(workspaceId: string) {
  const events = await prisma.growthLeadCaptureEvent.findMany({
    where: { form: { workspaceId } },
    select: { payload: true, formId: true, createdAt: true, form: { select: { name: true, metadata: true } } },
    take: 2000,
  });

  const byStage: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byCampaign: Record<string, number> = {};
  const byForm: Record<string, number> = {};

  for (const e of events) {
    const crm = getLeadCrm(e.payload);
    byStage[crm.pipeline_stage] = (byStage[crm.pipeline_stage] ?? 0) + 1;
    const src = crm.source ?? "unknown";
    bySource[src] = (bySource[src] ?? 0) + 1;
    const camp = crm.campaign ?? "unknown";
    byCampaign[camp] = (byCampaign[camp] ?? 0) + 1;
    byForm[e.formId] = (byForm[e.formId] ?? 0) + 1;
  }

  return {
    workspace_id: workspaceId,
    total: events.length,
    by_pipeline_stage: byStage,
    by_source: bySource,
    by_campaign: byCampaign,
    by_form: byForm,
  };
}

export { isPipelineStage };
