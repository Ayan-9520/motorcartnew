import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import {
  listPublishQueue,
  processPublishQueueStub,
} from "@/services/growth-social-scheduler.service";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "socialScheduler");
  if ("response" in gate) return gate.response;

  const rows = await listPublishQueue(gate.ctx.workspace.id);
  if (!rows) return err("Not found", 404);
  return ok({ data: rows });
}

export async function POST(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "socialScheduler");
  if ("response" in gate) return gate.response;

  const result = await processPublishQueueStub(gate.ctx.workspace.id);
  if (!result) return err("Not found", 404);
  return ok({ data: result });
}
