import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { getSocialAnalyticsHooks } from "@/services/growth-social-scheduler.service";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "socialScheduler");
  if ("response" in gate) return gate.response;

  const rows = await getSocialAnalyticsHooks(gate.ctx.workspace.id);
  if (!rows) return err("Not found", 404);
  return ok({ data: rows });
}
