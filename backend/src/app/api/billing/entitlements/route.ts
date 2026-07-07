import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireBillingAuth } from "@/lib/billing/guard";
import { getBillingEntitlements } from "@/services/billing.service";

export async function GET(req: NextRequest) {
  const gate = await requireBillingAuth(req);
  if ("response" in gate) return gate.response;

  const bp = req.nextUrl.searchParams.get("business_profile_id");

  try {
    const data = await getBillingEntitlements(gate.userId, {
      business_profile_id: bp,
      user_role: gate.role,
    });
    return ok({ data });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed", 500);
  }
}
