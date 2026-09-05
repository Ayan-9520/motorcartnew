import { NextRequest } from "next/server";
import type { FinanceStatus } from "@prisma/client";
import { ok } from "@/lib/api-response";
import { financeActorFrom, financeMarketplaceOff, handleFinanceError } from "@/lib/finance/http";
import { serializeApplication } from "@/lib/finance/serialize";
import { advanceApplicationStatus } from "@/services/finance-marketplace.service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: Ctx) {
  const off = financeMarketplaceOff();
  if (off) return off;
  try {
    const actor = financeActorFrom(req);
    const { id } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;
    const status = String(body.status) as FinanceStatus;
    const app = await advanceApplicationStatus(actor, id, status, body.note ? String(body.note) : undefined);
    return ok({ data: serializeApplication(app) });
  } catch (e) {
    return handleFinanceError(e);
  }
}
