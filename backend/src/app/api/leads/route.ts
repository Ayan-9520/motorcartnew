import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { ok, err, unauthorized } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { createMarketplaceLead } from "@/services/marketplace-lead.service";

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const dealerId = req.nextUrl.searchParams.get("dealer_id");
  const leads = await prisma.lead.findMany({
    where: dealerId ? { dealerId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return ok({ data: leads.map((l) => toSnakeRow(l as unknown as Record<string, unknown>)) });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (!body.name || !body.phone) {
      return err("Name and phone are required", 400);
    }

    const lead = await createMarketplaceLead({
      dealer_id: body.dealer_id as string | undefined,
      dealer_slug: body.dealer_slug as string | undefined,
      name: String(body.name),
      phone: String(body.phone),
      email: body.email as string | undefined,
      source: (body.source as string) ?? "website",
      notes: body.notes as string | undefined,
      vehicle_id: body.vehicle_id as string | undefined,
      vehicle_title: body.vehicle_title as string | undefined,
      vehicle_slug: body.vehicle_slug as string | undefined,
      metadata: (body.metadata as Record<string, unknown>) ?? {},
    });

    return ok({ data: toSnakeRow(lead as unknown as Record<string, unknown>) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save enquiry";
    return err(msg, 400);
  }
}
