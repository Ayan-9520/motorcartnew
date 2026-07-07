import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { handleGrowthServiceError } from "@/lib/growth/http";
import { mockSendBroadcast } from "@/services/growth-broadcast.service";

/** Mock send — no Meta/Twilio/Gupshup */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "whatsapp");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  try {
    const row = await mockSendBroadcast(gate.ctx.workspace.id, id);
    if (!row) return err("Broadcast not found or not sendable", 404);
    return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
  } catch (e) {
    const handled = handleGrowthServiceError(e);
    if (handled) return handled;
    throw e;
  }
}
