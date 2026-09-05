import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import {
  assignSubscription,
  changeSubscriptionStatus,
  listOrganizationSubscriptions,
} from "@/services/commercial-billing.service";

export async function GET(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const organizationId = req.nextUrl.searchParams.get("organizationId") ?? undefined;
    const data = await listOrganizationSubscriptions(actor, organizationId);
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
      planId?: string;
      billingCycle?: string;
      trial?: boolean;
      subscriptionId?: string;
      status?: string;
    };
    if (body.subscriptionId && body.status) {
      const data = await changeSubscriptionStatus(actor, body.subscriptionId, body.status);
      return ok({ data });
    }
    const data = await assignSubscription(actor, {
      organizationId: String(body.organizationId),
      planId: String(body.planId),
      billingCycle: body.billingCycle,
      trial: body.trial,
    });
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}
