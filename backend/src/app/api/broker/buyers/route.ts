import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireBrokerContext } from "@/lib/broker/guard";
import { createBrokerBuyer, listBrokerBuyers } from "@/services/broker-buyer.service";

export async function GET(req: NextRequest) {
  const gate = await requireBrokerContext(req, "contacts");
  if ("response" in gate) return gate.response;

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const rows = await listBrokerBuyers(gate.ctx.broker.id, status);
  return ok({ data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)) });
}

export async function POST(req: NextRequest) {
  const gate = await requireBrokerContext(req, "contacts");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const fullName = String(body.full_name ?? body.fullName ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  if (!fullName || !phone) return err("full_name and phone are required", 400);

  const row = await createBrokerBuyer(gate.ctx.broker.id, {
    fullName,
    phone,
    email: body.email ? String(body.email) : null,
    city: body.city ? String(body.city) : null,
    budgetMin: body.budget_min != null ? BigInt(Number(body.budget_min)) : null,
    budgetMax: body.budget_max != null ? BigInt(Number(body.budget_max)) : null,
    preferredBrands: (body.preferred_brands as object) ?? [],
    preferredFuel: body.preferred_fuel ? String(body.preferred_fuel) : null,
    notes: body.notes ? String(body.notes) : null,
    status: body.status ? String(body.status) : "active",
    metadata: (body.metadata as object) ?? {},
  });

  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}
