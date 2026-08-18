import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { catalogAdminOffResponse } from "@/lib/catalog/guard";
import {
  catalogImportApprovalBodySchema,
  catalogImportJobIdSchema,
} from "@/lib/catalog/import/catalog-import-admin.validation";
import { catalogImportAdminService } from "@/services/catalog-import-admin.service";

type Ctx = { params: Promise<{ jobId: string }> };

export async function POST(req: NextRequest, context: Ctx) {
  const off = catalogAdminOffResponse();
  if (off) return off;

  try {
    const actor = requirePlatformAdmin(req);
    const { jobId: rawJobId } = await context.params;
    const jobId = catalogImportJobIdSchema.parse(rawJobId);
    const body = catalogImportApprovalBodySchema.parse(await req.json());

    if (!body.reason?.trim()) {
      return err("Rejection reason is required", 400);
    }

    if (!catalogImportAdminService.getJob(jobId)) {
      return err("Import job not found", 404);
    }

    const result = catalogImportAdminService.applyApproval(jobId, "reject", body, {
      userId: actor.sub,
      role: actor.role,
    });

    return ok(result);
  } catch (e) {
    if (e instanceof ZodError) {
      return err(e.errors.map((issue) => issue.message).join("; "), 400);
    }
    const msg = e instanceof Error ? e.message : "Reject failed";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    if (msg === "IMPORT_JOB_NOT_READY") return err("Import report not ready — job is still running", 409);
    return err(msg, 500);
  }
}
