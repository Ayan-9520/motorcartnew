import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireBrokerContext } from "@/lib/broker/guard";
import { updateBrokerProfile } from "@/services/broker-profile.service";

export async function GET(req: NextRequest) {
  const gate = await requireBrokerContext(req, "crm");
  if ("response" in gate) return gate.response;
  return ok({ data: toSnakeRow(gate.ctx.broker as unknown as Record<string, unknown>) });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireBrokerContext(req, "crm");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const allowed = [
    "name",
    "license_number",
    "city",
    "state",
    "phone",
    "whatsapp_number",
    "email",
    "commission_default_rate",
    "metadata",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    if (body[key] !== undefined) data[camel] = body[key];
    if (body[camel] !== undefined) data[camel] = body[camel];
  }

  if (Object.keys(data).length === 0) return err("No fields to update", 400);

  const updated = await updateBrokerProfile(gate.ctx.broker.id, data);
  return ok({ data: toSnakeRow(updated as unknown as Record<string, unknown>) });
}
