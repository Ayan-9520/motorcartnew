import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { isPipelineStage } from "@/lib/growth/lead-pipeline";
import { listPipelineLeads } from "@/services/growth-lead-pipeline.service";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "leadPipeline");
  if ("response" in gate) return gate.response;

  const { searchParams } = new URL(req.url);
  const stageRaw = searchParams.get("stage");
  const stage = stageRaw && isPipelineStage(stageRaw) ? stageRaw : undefined;

  const rows = await listPipelineLeads(gate.ctx.workspace.id, {
    stage,
    assigneeUserId: searchParams.get("assignee_user_id") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    campaign: searchParams.get("campaign") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined,
  });

  return ok({ data: rows });
}
