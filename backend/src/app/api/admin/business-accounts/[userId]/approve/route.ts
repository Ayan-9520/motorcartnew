import { NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { approveBusinessAccount } from "@/services/platform-admin.service";

type RouteContext = { params: Promise<{ userId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    requirePlatformAdmin(req);
    const { userId } = await context.params;
    if (!userId) return err("userId required");
    await approveBusinessAccount(userId);
    return ok({ ok: true, userId, status: "active" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Approve failed";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    if (msg === "USER_NOT_FOUND") return err("User not found", 404);
    if (msg === "NOT_BUSINESS_ACCOUNT") return err("Not a business account", 400);
    return err(msg, 500);
  }
}
