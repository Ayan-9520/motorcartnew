import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireBillingAuth } from "@/lib/billing/guard";
import {
  changeBillingSubscription,
  getBillingSubscription,
} from "@/services/billing.service";

function queryFromReq(req: NextRequest, role: string) {
  const bp = req.nextUrl.searchParams.get("business_profile_id");
  return { business_profile_id: bp, user_role: role };
}

export async function GET(req: NextRequest) {
  const gate = await requireBillingAuth(req);
  if ("response" in gate) return gate.response;

  try {
    const data = await getBillingSubscription(gate.userId, queryFromReq(req, gate.role));
    return ok({ data });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed", 500);
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireBillingAuth(req);
  if ("response" in gate) return gate.response;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const planSlug = String(body.plan_slug ?? "");
    if (!planSlug) return err("plan_slug required", 400);

    const data = await changeBillingSubscription(gate.userId, {
      plan_slug: planSlug,
      billing_cycle:
        body.billing_cycle === "annual" ? "annual" : "monthly",
      business_profile_id:
        body.business_profile_id != null
          ? String(body.business_profile_id)
          : req.nextUrl.searchParams.get("business_profile_id"),
      user_role: gate.role,
    });
    return ok({ data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "INVALID_PLAN") return err("Unknown plan", 400);
    return err(msg, 500);
  }
}
