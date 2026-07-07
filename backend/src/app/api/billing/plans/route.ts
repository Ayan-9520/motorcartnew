import { ok } from "@/lib/api-response";
import { requireBillingPublic } from "@/lib/billing/guard";
import { listBillingPlans } from "@/services/billing.service";

export async function GET() {
  const gate = requireBillingPublic();
  if ("response" in gate) return gate.response;
  return ok({ data: { plans: listBillingPlans() } });
}
