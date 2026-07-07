import { NextRequest } from "next/server";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { founderDashboardOffResponse } from "@/lib/founder/guard";
import { getFounderDashboardMetrics } from "@/services/founder-dashboard.service";

export async function GET(req: NextRequest) {
  const off = founderDashboardOffResponse();
  if (off) return off;

  try {
    requirePlatformAdmin(req);
    const metrics = await getFounderDashboardMetrics();
    return ok({ data: metrics });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return err(msg, 500);
  }
}
