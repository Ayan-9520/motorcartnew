import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import {
  enqueueWhatsappMessage,
  listWhatsappQueue,
  processWhatsappQueueStub,
} from "@/services/growth-whatsapp-architecture.service";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "whatsappProviders");
  if ("response" in gate) return gate.response;

  const rows = await listWhatsappQueue(gate.ctx.workspace.id);
  if (!rows) return err("Not found", 404);
  return ok({ data: rows });
}

export async function POST(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "whatsappProviders");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as {
    phone?: string;
    body?: string;
    template_key?: string;
    action?: string;
  };

  if (body.action === "process") {
    const result = await processWhatsappQueueStub(gate.ctx.workspace.id);
    if (!result) return err("Not found", 404);
    return ok({ data: result });
  }

  if (!body.phone) return err("phone required", 400);
  const row = await enqueueWhatsappMessage(gate.ctx.workspace.id, {
    phone: String(body.phone),
    body: body.body != null ? String(body.body) : undefined,
    template_key: body.template_key != null ? String(body.template_key) : undefined,
  });
  if (!row) return err("Not found", 404);
  return ok({ data: row });
}
