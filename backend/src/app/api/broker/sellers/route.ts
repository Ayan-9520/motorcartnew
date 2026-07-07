import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireBrokerContext } from "@/lib/broker/guard";
import { createBrokerSeller, listBrokerSellers } from "@/services/broker-seller.service";

export async function GET(req: NextRequest) {
  const gate = await requireBrokerContext(req, "contacts");
  if ("response" in gate) return gate.response;

  const rows = await listBrokerSellers(gate.ctx.broker.id);
  return ok({ data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)) });
}

export async function POST(req: NextRequest) {
  const gate = await requireBrokerContext(req, "contacts");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const fullName = String(body.full_name ?? body.fullName ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  if (!fullName || !phone) return err("full_name and phone are required", 400);

  const row = await createBrokerSeller(gate.ctx.broker.id, {
    fullName,
    phone,
    email: body.email ? String(body.email) : null,
    city: body.city ? String(body.city) : null,
    sellerType: body.seller_type ? String(body.seller_type) : "individual",
    kycStatus: body.kyc_status ? String(body.kyc_status) : "pending",
    notes: body.notes ? String(body.notes) : null,
    metadata: (body.metadata as object) ?? {},
  });

  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}
