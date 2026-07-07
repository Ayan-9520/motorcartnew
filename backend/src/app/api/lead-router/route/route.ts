import { NextRequest } from "next/server";
import { ok, err, unauthorized } from "@/lib/api-response";
import { requireLeadRouterAuth } from "@/lib/lead-router/guard";
import { routeLead } from "@/services/lead-router.service";
import type { RouteLeadInput } from "@/lib/lead-router/types";

export async function POST(req: NextRequest) {
  const gate = await requireLeadRouterAuth(req);
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as RouteLeadInput;

  try {
    const record = await routeLead(body);
    return ok({ data: record });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Route failed";
    if (msg.startsWith("INVALID_SOURCE")) return err(msg.replace("INVALID_SOURCE: ", ""), 400);
    return err(msg, 500);
  }
}
