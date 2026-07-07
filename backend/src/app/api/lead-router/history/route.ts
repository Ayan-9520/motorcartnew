import { NextRequest } from "next/server";
import { ok, unauthorized, forbidden, err } from "@/lib/api-response";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { requireLeadRouterPublic } from "@/lib/lead-router/guard";
import { getLeadRouterHistory } from "@/services/lead-router.service";

export async function GET(req: NextRequest) {
  const gate = requireLeadRouterPublic();
  if ("response" in gate) return gate.response;

  try {
    requirePlatformAdmin(req);
    const sp = req.nextUrl.searchParams;
    const data = await getLeadRouterHistory({
      source: sp.get("source") ?? undefined,
      destination: sp.get("destination") ?? undefined,
      status: sp.get("status") ?? undefined,
      limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
      offset: sp.get("offset") ? parseInt(sp.get("offset")!, 10) : undefined,
    });
    return ok({ data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return err(msg, 500);
  }
}
