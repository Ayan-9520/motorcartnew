import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { addLeadNote } from "@/services/growth-lead-pipeline.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "leadPipeline");
  if ("response" in gate) return gate.response;

  const { eventId } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = String(body.text ?? "").trim();
  if (!text) return err("text is required", 400);

  const row = await addLeadNote(gate.ctx.workspace.id, eventId, text, gate.ctx.auth.sub);
  if (!row) return err("Not found", 404);
  return ok({ data: row }, 201);
}
