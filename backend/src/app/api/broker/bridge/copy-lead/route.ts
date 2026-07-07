import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireBrokerContext } from "@/lib/broker/guard";
import { copyDealerLeadToBrokerLead } from "@/services/broker-marketplace-bridge.service";

/** Flag-gated copy endpoint — not used by marketplace enquiry flow. */
export async function POST(req: NextRequest) {
  const gate = await requireBrokerContext(req, "marketplaceBridge");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const marketplaceLeadId = String(
    body.marketplace_lead_id ?? body.marketplaceLeadId ?? ""
  ).trim();
  if (!marketplaceLeadId) return err("marketplace_lead_id is required", 400);

  try {
    const row = await copyDealerLeadToBrokerLead({
      brokerId: gate.ctx.broker.id,
      marketplaceLeadId,
    });
    return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bridge failed";
    return err(msg, 400);
  }
}
