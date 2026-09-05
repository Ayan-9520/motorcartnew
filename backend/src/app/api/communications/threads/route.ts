import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { commActorFrom, handleCommosError } from "@/lib/commos/http";
import { requireDealerContext } from "@/lib/sales-os/access";

export async function GET(req: NextRequest) {
  try {
    const actor = commActorFrom(req);
    const dealer = await requireDealerContext(actor);
    const leadId = req.nextUrl.searchParams.get("leadId");
    const data = await prisma.communicationThread.findMany({
      where: { dealerId: dealer.id, ...(leadId ? { leadId } : {}) },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return ok({ data });
  } catch (e) {
    return handleCommosError(e);
  }
}
