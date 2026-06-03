import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { reviewKyc } from "@/services/platform-admin.service";

type Ctx = { params: Promise<{ userId: string }> };

const schema = z.object({
  action: z.enum(["verified", "rejected"]),
});

export async function POST(req: NextRequest, context: Ctx) {
  try {
    requirePlatformAdmin(req);
    const { userId } = await context.params;
    const { action } = schema.parse(await req.json());
    await reviewKyc(userId, action);
    return ok({ ok: true, kycStatus: action });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "KYC review failed";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    if (msg === "USER_NOT_FOUND") return err("User not found", 404);
    return err(msg, 400);
  }
}
