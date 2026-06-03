import { NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { listPendingBusinessAccounts } from "@/services/platform-admin.service";

export async function GET(req: NextRequest) {
  try {
    requirePlatformAdmin(req);
    const accounts = await listPendingBusinessAccounts();
    return ok({ accounts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return err(msg, 500);
  }
}
