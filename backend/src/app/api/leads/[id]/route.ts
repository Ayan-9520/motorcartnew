import { NextRequest } from "next/server";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";

const ADMIN_ROLES = new Set(["super_admin", "admin"]);
const DEALER_ROLES = new Set(["dealer", "used_car_dealer", "new_car_dealer", "bike_dealer", "truck_dealer"]);

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { id } = await ctx.params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return err("Lead not found", 404);

  if (!ADMIN_ROLES.has(auth.role)) {
    if (!DEALER_ROLES.has(auth.role)) return forbidden();
    const dealer = await prisma.dealer.findFirst({ where: { ownerId: auth.sub, id: lead.dealerId } });
    if (!dealer) return forbidden();
  }

  return ok({ data: toSnakeRow(lead as unknown as Record<string, unknown>) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return err("Lead not found", 404);

  if (!ADMIN_ROLES.has(auth.role)) {
    if (!DEALER_ROLES.has(auth.role)) return forbidden();
    const dealer = await prisma.dealer.findFirst({ where: { ownerId: auth.sub, id: existing.dealerId } });
    if (!dealer) return forbidden();
  }

  const body = (await req.json()) as Record<string, unknown>;
  const status = body.status as string | undefined;
  const notes = body.notes as string | undefined;

  if (!status && notes === undefined) {
    return err("Nothing to update", 400);
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      ...(status ? { status: status as LeadStatus } : {}),
      ...(notes !== undefined ? { notes: String(notes) } : {}),
    },
  });

  return ok({ data: toSnakeRow(updated as unknown as Record<string, unknown>) });
}
