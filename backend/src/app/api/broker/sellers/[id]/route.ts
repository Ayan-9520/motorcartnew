import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireBrokerContext } from "@/lib/broker/guard";
import {
  deleteBrokerSeller,
  getBrokerSeller,
  updateBrokerSeller,
} from "@/services/broker-seller.service";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireBrokerContext(req, "contacts");
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const row = await getBrokerSeller(gate.ctx.broker.id, id);
  if (!row) return err("Seller not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireBrokerContext(req, "contacts");
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await updateBrokerSeller(gate.ctx.broker.id, id, {
    fullName: body.full_name != null ? String(body.full_name) : undefined,
    phone: body.phone != null ? String(body.phone) : undefined,
    email: body.email != null ? String(body.email) : undefined,
    city: body.city != null ? String(body.city) : undefined,
    sellerType: body.seller_type != null ? String(body.seller_type) : undefined,
    kycStatus: body.kyc_status != null ? String(body.kyc_status) : undefined,
    notes: body.notes != null ? String(body.notes) : undefined,
    metadata: body.metadata as object | undefined,
  });

  const row = await getBrokerSeller(gate.ctx.broker.id, id);
  if (!row) return err("Seller not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireBrokerContext(req, "contacts");
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const okDel = await deleteBrokerSeller(gate.ctx.broker.id, id);
  if (!okDel) return err("Seller not found", 404);
  return ok({ data: { deleted: true } });
}
