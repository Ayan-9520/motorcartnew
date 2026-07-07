import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import {
  getDeliveryRecord,
  getWorkspaceWhatsappArchitecture,
} from "@/services/growth-whatsapp-architecture.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const gate = await requireGrowthWorkspace(req, "whatsappProviders");
  if ("response" in gate) return gate.response;

  const { messageId } = await params;
  const arch = await getWorkspaceWhatsappArchitecture(gate.ctx.workspace.id);
  if (!arch) return err("Not found", 404);

  const record = getDeliveryRecord(arch, messageId);
  if (!record) return err("Delivery record not found", 404);
  return ok({ data: record });
}
