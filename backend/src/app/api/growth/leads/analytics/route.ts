import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { getLeadAnalytics } from "@/services/growth-lead-pipeline.service";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "leadPipeline");
  if ("response" in gate) return gate.response;

  const analytics = await getLeadAnalytics(gate.ctx.workspace.id);
  return ok({ data: analytics });
}
