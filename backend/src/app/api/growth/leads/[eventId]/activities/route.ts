import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { addLeadActivity } from "@/services/growth-lead-pipeline.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "leadPipeline");
  if ("response" in gate) return gate.response;

  const { eventId } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const summary = String(body.summary ?? body.text ?? "").trim();
  const type = String(body.type ?? "task").trim();
  if (!summary) return err("summary is required", 400);

  const row = await addLeadActivity(gate.ctx.workspace.id, eventId, {
    type,
    summary,
    created_by: gate.ctx.auth.sub,
  });
  if (!row) return err("Not found", 404);
  return ok({ data: row }, 201);
}
