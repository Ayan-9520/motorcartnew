import { NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { rejectBusinessAccount } from "@/services/platform-admin.service";

type RouteContext = { params: Promise<{ userId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    requirePlatformAdmin(req);
    const { userId } = await context.params;
    if (!userId) return err("userId required");
    const body = (await req.json().catch(() => ({}))) as { reason?: string };
    await rejectBusinessAccount(userId, body.reason);
    return ok({ ok: true, userId, approvalStatus: "rejected" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Reject failed";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    if (msg === "USER_NOT_FOUND") return err("User not found", 404);
    return err(msg, 500);
  }
}
