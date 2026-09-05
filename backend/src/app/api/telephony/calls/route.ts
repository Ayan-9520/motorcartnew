import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { commActorFrom, handleCommosError } from "@/lib/commos/http";
import { prisma } from "@/lib/prisma";
import { requireDealerContext } from "@/lib/sales-os/access";
import { initiateCall } from "@/services/telephony.service";
import { assertDialerLocked } from "@/lib/sales-os/http";

export async function GET(req: NextRequest) {
  try {
    const actor = commActorFrom(req);
    assertDialerLocked();
    const dealer = await requireDealerContext(actor);
    const data = await prisma.callSession.findMany({
      where: { dealerId: dealer.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok({ data });
  } catch (e) {
    return handleCommosError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = commActorFrom(req);
    assertDialerLocked();
    const body = (await req.json()) as Record<string, unknown>;
    const data = await initiateCall(actor, {
      leadId: String(body.leadId ?? ""),
      notes: typeof body.notes === "string" ? body.notes : undefined,
      record: body.record === true,
      aiCalling: body.aiCalling === true,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleCommosError(e);
  }
}
