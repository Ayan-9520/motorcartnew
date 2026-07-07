import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireBrokerContext } from "@/lib/broker/guard";
import { createBrokerLead, listBrokerLeads } from "@/services/broker-lead.service";

export async function GET(req: NextRequest) {
  const gate = await requireBrokerContext(req, "leads");
  if ("response" in gate) return gate.response;

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const rows = await listBrokerLeads(gate.ctx.broker.id, status);
  return ok({ data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)) });
}

export async function POST(req: NextRequest) {
  const gate = await requireBrokerContext(req, "leads");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  if (!name || !phone) return err("name and phone are required", 400);

  const row = await createBrokerLead(gate.ctx.broker.id, {
    name,
    phone,
    email: body.email ? String(body.email) : null,
    source: body.source ? String(body.source) : "manual",
    status: body.status ? String(body.status) : "new",
    buyerId: body.buyer_id ? String(body.buyer_id) : null,
    sellerId: body.seller_id ? String(body.seller_id) : null,
    vehicleInterest: body.vehicle_interest ? String(body.vehicle_interest) : null,
    vehicleId: body.vehicle_id ? String(body.vehicle_id) : null,
    vehicleSlug: body.vehicle_slug ? String(body.vehicle_slug) : null,
    saleMode: body.sale_mode ? String(body.sale_mode) : null,
    assignedTo: body.assigned_to ? String(body.assigned_to) : null,
    notes: body.notes ? String(body.notes) : null,
    metadata: (body.metadata as object) ?? {},
  });

  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}
