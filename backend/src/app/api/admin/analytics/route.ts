import { NextRequest } from "next/server";
import { err, forbidden, ok, unauthorized } from "@/lib/api-response";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { getPlatformAnalytics } from "@/services/platform-analytics.service";

export async function GET(req: NextRequest) {
  try {
    requirePlatformAdmin(req);
    const analytics = await getPlatformAnalytics();
    return ok({ analytics });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return err("Analytics unavailable", 500);
  }
}
