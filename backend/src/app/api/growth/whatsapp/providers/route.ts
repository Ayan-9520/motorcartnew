import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import {
  getWorkspaceWhatsappArchitecture,
  setActiveWhatsappProvider,
} from "@/services/growth-whatsapp-architecture.service";
import type { WhatsappProviderId } from "@/lib/growth/whatsapp/types";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "whatsappProviders");
  if ("response" in gate) return gate.response;

  const arch = await getWorkspaceWhatsappArchitecture(gate.ctx.workspace.id);
  if (!arch) return err("Not found", 404);
  return ok({ data: arch });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "whatsappProviders");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as { active_provider?: string };
  const provider = body.active_provider as WhatsappProviderId | undefined;
  if (!provider) return err("active_provider required", 400);

  const row = await setActiveWhatsappProvider(gate.ctx.workspace.id, provider);
  if (!row) return err("Not found", 404);
  return ok({ data: { active_provider: provider } });
}
