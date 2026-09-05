import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import { createPromotionOrder } from "@/services/commercial-billing.service";
import { prisma } from "@/lib/prisma";
import { requirePartnerOrg } from "@/services/commercial-billing.service";
import { isAdminRole } from "@/lib/commercial/http";

export async function GET(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const organizationId = req.nextUrl.searchParams.get("organizationId") ?? undefined;
    if (isAdminRole(actor.role) && !organizationId) {
      const data = await prisma.promotionOrder.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
      return ok({ data });
    }
    const org = await requirePartnerOrg(actor, organizationId);
    const data = await prisma.promotionOrder.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
    });
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const body = (await req.json()) as { organizationId?: string; productType?: string; durationDays?: number; price?: number };
    const data = await createPromotionOrder(actor, {
      organizationId: body.organizationId,
      productType: String(body.productType),
      durationDays: Number(body.durationDays),
      price: Number(body.price),
    });
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
