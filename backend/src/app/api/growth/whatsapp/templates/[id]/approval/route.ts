import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import {
  getTemplateApproval,
  submitTemplateForApproval,
} from "@/services/growth-whatsapp-architecture.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "whatsappProviders");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const row = await getTemplateApproval(gate.ctx.workspace.id, id);
  if (!row) return err("Not found", 404);
  return ok({ data: row });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "whatsappProviders");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const row = await submitTemplateForApproval(gate.ctx.workspace.id, id);
  if (!row) return err("Not found", 404);
  return ok({ data: row });
}
