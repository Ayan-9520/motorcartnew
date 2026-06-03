import { NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { ok, unauthorized, forbidden } from "@/lib/api-response";
import { ADMIN_OPERATION_FLOWS } from "@/services/platform-admin.service";

export async function GET(req: NextRequest) {
  try {
    requirePlatformAdmin(req);
    return ok({ flows: ADMIN_OPERATION_FLOWS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return ok({ flows: ADMIN_OPERATION_FLOWS });
  }
}
