import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { deleteAdminUser, updateAdminUser } from "@/services/platform-admin.service";

type Ctx = { params: Promise<{ userId: string }> };

const patchSchema = z.object({
  status: z.enum(["active", "suspended", "pending_verification", "closed"]).optional(),
  role: z.string().optional(),
  kyc_status: z.enum(["pending", "submitted", "verified", "rejected"]).optional(),
});

export async function PATCH(req: NextRequest, context: Ctx) {
  try {
    requirePlatformAdmin(req);
    const { userId } = await context.params;
    const body = patchSchema.parse(await req.json());
    await updateAdminUser(userId, {
      status: body.status,
      role: body.role as never,
      kycStatus: body.kyc_status,
    });
    return ok({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    if (msg === "USER_NOT_FOUND") return err("User not found", 404);
    return err(msg, 400);
  }
}

export async function DELETE(req: NextRequest, context: Ctx) {
  try {
    const actor = requirePlatformAdmin(req);
    const { userId } = await context.params;
    await deleteAdminUser(userId, actor.sub);
    return ok({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    if (msg === "USER_NOT_FOUND") return err("User not found", 404);
    if (msg === "CANNOT_DELETE_SELF") return err("You cannot delete your own account", 400);
    if (msg === "CANNOT_DELETE_LAST_ADMIN") return err("Cannot delete the last platform admin", 400);
    return err(msg, 400);
  }
}
