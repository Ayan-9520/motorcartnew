import { NextRequest } from "next/server";
import { z } from "zod";
import type { FinanceStatus } from "@prisma/client";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { updateFinanceApplicationStatus } from "@/services/platform-admin.service";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  status: z.enum(["processing", "approved", "rejected", "disbursed"]),
  note: z.string().optional(),
});

export async function POST(req: NextRequest, context: Ctx) {
  try {
    const admin = requirePlatformAdmin(req);
    const { id } = await context.params;
    const { status, note } = schema.parse(await req.json());
    await updateFinanceApplicationStatus(id, status as FinanceStatus, admin.sub, note);
    return ok({ ok: true, status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    if (msg === "INVALID_STATUS") return err("Invalid status", 400);
    return err(msg, 400);
  }
}
