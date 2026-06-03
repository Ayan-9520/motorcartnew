import { NextRequest } from "next/server";
import type { FinanceStatus } from "@prisma/client";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { listFinanceApplicationsForAdmin } from "@/services/platform-admin.service";

export async function GET(req: NextRequest) {
  try {
    requirePlatformAdmin(req);
    const status = req.nextUrl.searchParams.get("status") as FinanceStatus | null;
    const applications = await listFinanceApplicationsForAdmin(status ?? undefined);
    return ok({ applications });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return err(msg, 500);
  }
}
