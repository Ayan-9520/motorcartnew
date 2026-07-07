import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { recordWhatsappOptIn } from "@/services/growth-whatsapp-architecture.service";

export async function POST(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "whatsappProviders");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as { phone?: string; source?: string };
  if (!body.phone) return err("phone required", 400);

  const row = await recordWhatsappOptIn(gate.ctx.workspace.id, {
    phone: String(body.phone),
    source: body.source != null ? String(body.source) : undefined,
  });
  if (!row) return err("Not found", 404);
  return ok({ data: row });
}
