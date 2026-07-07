import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireBrokerContext } from "@/lib/broker/guard";
import {
  deleteBrokerLead,
  getBrokerLead,
  updateBrokerLead,
} from "@/services/broker-lead.service";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireBrokerContext(req, "leads");
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const row = await getBrokerLead(gate.ctx.broker.id, id);
  if (!row) return err("Lead not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireBrokerContext(req, "leads");
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await updateBrokerLead(gate.ctx.broker.id, id, {
    name: body.name != null ? String(body.name) : undefined,
    phone: body.phone != null ? String(body.phone) : undefined,
    email: body.email != null ? String(body.email) : undefined,
    status: body.status != null ? String(body.status) : undefined,
    vehicleInterest: body.vehicle_interest != null ? String(body.vehicle_interest) : undefined,
    notes: body.notes != null ? String(body.notes) : undefined,
    metadata: body.metadata as object | undefined,
  });

  const row = await getBrokerLead(gate.ctx.broker.id, id);
  if (!row) return err("Lead not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireBrokerContext(req, "leads");
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const okDel = await deleteBrokerLead(gate.ctx.broker.id, id);
  if (!okDel) return err("Lead not found", 404);
  return ok({ data: { deleted: true } });
}
