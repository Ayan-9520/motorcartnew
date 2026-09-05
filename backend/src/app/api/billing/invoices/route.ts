import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import { createDraftInvoice, issueInvoice, listInvoices, voidInvoice } from "@/services/commercial-billing.service";

export async function GET(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const data = await listInvoices(actor, req.nextUrl.searchParams.get("organizationId") ?? undefined);
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
      action?: string;
      invoiceId?: string;
      organizationId?: string;
      paymentId?: string;
      kind?: string;
      lines?: Array<{ description: string; hsnSac?: string; quantity?: number; unitPrice: number }>;
      intraState?: boolean;
      buyerGstin?: string;
      placeOfSupply?: string;
      billingAddress?: Record<string, unknown>;
    };
    if (body.action === "issue" && body.invoiceId) {
      return ok({ data: await issueInvoice(actor, body.invoiceId) });
    }
    if (body.action === "void" && body.invoiceId) {
      return ok({ data: await voidInvoice(actor, body.invoiceId) });
    }
    const data = await createDraftInvoice(actor, {
      organizationId: String(body.organizationId),
      paymentId: body.paymentId,
      kind: body.kind,
      lines: body.lines ?? [],
      intraState: Boolean(body.intraState),
      buyerGstin: body.buyerGstin,
      placeOfSupply: body.placeOfSupply,
      billingAddress: body.billingAddress,
    });
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
