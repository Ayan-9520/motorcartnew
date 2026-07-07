import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { isPipelineStage, type PipelineStage } from "@/lib/growth/lead-pipeline";
import {
  getPipelineLead,
  updatePipelineLead,
} from "@/services/growth-lead-pipeline.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "leadPipeline");
  if ("response" in gate) return gate.response;

  const { eventId } = await params;
  const row = await getPipelineLead(gate.ctx.workspace.id, eventId);
  if (!row) return err("Not found", 404);
  return ok({ data: row });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "leadPipeline");
  if ("response" in gate) return gate.response;

  const { eventId } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const stageRaw = body.pipeline_stage ?? body.pipelineStage;
  let pipeline_stage: PipelineStage | undefined;
  if (stageRaw != null) {
    const s = String(stageRaw).toLowerCase();
    if (isPipelineStage(s)) pipeline_stage = s;
  }

  const row = await updatePipelineLead(gate.ctx.workspace.id, eventId, {
    pipeline_stage,
    source: body.source !== undefined ? (body.source ? String(body.source) : null) : undefined,
    campaign: body.campaign !== undefined ? (body.campaign ? String(body.campaign) : null) : undefined,
    assignee_user_id:
      body.assignee_user_id !== undefined
        ? body.assignee_user_id
          ? String(body.assignee_user_id)
          : null
        : undefined,
    assignee_name:
      body.assignee_name !== undefined
        ? body.assignee_name
          ? String(body.assignee_name)
          : null
        : undefined,
    follow_up_at:
      body.follow_up_at !== undefined
        ? body.follow_up_at
          ? String(body.follow_up_at)
          : null
        : undefined,
    actor_user_id: gate.ctx.auth.sub,
  });

  if (!row) return err("Not found", 404);
  return ok({ data: row });
}
