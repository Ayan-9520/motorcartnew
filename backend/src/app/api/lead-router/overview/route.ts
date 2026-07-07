import { NextRequest } from "next/server";
import { ok, unauthorized, forbidden, err } from "@/lib/api-response";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { requireLeadRouterPublic } from "@/lib/lead-router/guard";
import { getLeadRouterOverview } from "@/services/lead-router.service";

export async function GET(req: NextRequest) {
  const gate = requireLeadRouterPublic();
  if ("response" in gate) return gate.response;

  try {
    requirePlatformAdmin(req);
    const data = await getLeadRouterOverview();
    return ok({ data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return err(msg, 500);
  }
}
