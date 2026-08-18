import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { catalogAdminOffResponse } from "@/lib/catalog/guard";
import { catalogImportJobIdSchema } from "@/lib/catalog/import/catalog-import-admin.validation";
import { catalogImportAdminService } from "@/services/catalog-import-admin.service";

type Ctx = { params: Promise<{ jobId: string }> };

export async function GET(req: NextRequest, context: Ctx) {
  const off = catalogAdminOffResponse();
  if (off) return off;

  try {
    requirePlatformAdmin(req);
    const { jobId: rawJobId } = await context.params;
    const jobId = catalogImportJobIdSchema.parse(rawJobId);

    const events = catalogImportAdminService.getApprovalAudit(jobId);
    if (!events) return err("Import job not found", 404);

    return ok({ jobId, dryRun: true as const, published: false as const, events });
  } catch (e) {
    if (e instanceof ZodError) {
      return err("Invalid job id", 400);
    }
    const msg = e instanceof Error ? e.message : "Failed to load approval audit";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return err(msg, 500);
  }
}
