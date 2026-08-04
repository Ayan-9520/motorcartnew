import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { createMarketplaceLead } from "@/services/marketplace-lead.service";

const ADMIN_ROLES = new Set(["super_admin", "admin"]);
const DEALER_ROLES = new Set(["dealer", "used_car_dealer", "new_car_dealer", "bike_dealer", "truck_dealer"]);

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const dealerIdParam = req.nextUrl.searchParams.get("dealer_id");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 100) || 100, 200);

  let where: { dealerId?: string | { in: string[] } } | undefined;

  if (ADMIN_ROLES.has(auth.role)) {
    where = dealerIdParam ? { dealerId: dealerIdParam } : undefined;
  } else if (DEALER_ROLES.has(auth.role)) {
    const owned = await prisma.dealer.findMany({
      where: { ownerId: auth.sub, deletedAt: null },
      select: { id: true },
    });
    const ids = owned.map((d) => d.id);
    if (!ids.length) return ok({ data: [] });
    if (dealerIdParam && !ids.includes(dealerIdParam)) return forbidden();
    where = { dealerId: dealerIdParam ? dealerIdParam : { in: ids } };
  } else {
    return forbidden("Only dealers and platform admins can list leads");
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { dealer: { select: { name: true, slug: true } } },
  });

  return ok({
    data: leads.map((l) => {
      const row = toSnakeRow(l as unknown as Record<string, unknown>);
      delete row.dealer;
      return {
        ...row,
        dealer_name: l.dealer?.name ?? null,
        dealer_slug: l.dealer?.slug ?? null,
        vehicle_title:
          (row.vehicle_interest as string | null) ??
          ((l.metadata as { vehicle_title?: string })?.vehicle_title ?? null),
      };
    }),
  });
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
