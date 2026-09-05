import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import {
  createPaymentRecord,
  listPayments,
  recordManualPayment,
  rejectClientPaidStatus,
} from "@/services/commercial-billing.service";

export async function GET(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const organizationId = req.nextUrl.searchParams.get("organizationId") ?? undefined;
    const data = await listPayments(actor, organizationId);
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const body = (await req.json()) as {
      organizationId?: string;
      purpose?: string;
      amount?: number;
      currency?: string;
      referenceType?: string;
      referenceId?: string;
      status?: string;
      paymentId?: string;
      action?: string;
    };
    await rejectClientPaidStatus(body.status);
    if (body.action === "manual" && body.paymentId) {
      const data = await recordManualPayment(actor, body.paymentId);
      return ok({ data });
    }
    const data = await createPaymentRecord(actor, {
      organizationId: body.organizationId,
      purpose: String(body.purpose),
      amount: Number(body.amount),
      currency: body.currency,
      referenceType: body.referenceType,
      referenceId: body.referenceId,
    });
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
