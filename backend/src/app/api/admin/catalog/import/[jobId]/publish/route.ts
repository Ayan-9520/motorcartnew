import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { catalogAdminOffResponse } from "@/lib/catalog/guard";
import { featureFlags } from "@/config/feature-flags";
import {
  catalogImportJobIdSchema,
  catalogImportPublishBodySchema,
} from "@/lib/catalog/import/catalog-import-admin.validation";
import { catalogImportAdminService } from "@/services/catalog-import-admin.service";

type Ctx = { params: Promise<{ jobId: string }> };

export async function POST(req: NextRequest, context: Ctx) {
  const off = catalogAdminOffResponse();
  if (off) return off;

  if (!featureFlags.catalogLayer) {
    return err("Catalog layer is disabled (FEATURE_CATALOG_LAYER)", 404);
  }

  try {
    const actor = requirePlatformAdmin(req);
    const { jobId: rawJobId } = await context.params;
    const jobId = catalogImportJobIdSchema.parse(rawJobId);
    const body = catalogImportPublishBodySchema.parse(await req.json());

    if (!catalogImportAdminService.getJob(jobId)) {
      return err("Import job not found", 404);
    }

    const report = await catalogImportAdminService.publish(jobId, body, {
      userId: actor.sub,
      role: actor.role,
    });

    return ok(report);
  } catch (e) {
    if (e instanceof ZodError) {
      return err(e.errors.map((issue) => issue.message).join("; "), 400);
    }
    const msg = e instanceof Error ? e.message : "Publish failed";
    const code = (e as { code?: string }).code;
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    if (msg === "IMPORT_JOB_NOT_READY") return err("Import report not ready — job is still running", 409);
    if (msg === "PUBLISH_CONFIRMATION_REQUIRED") return err("Explicit confirm: true is required", 400);
    if (code === "MOCK_SOURCE_PUBLISH_FORBIDDEN") {
      return err(msg, 403);
    }
    if (code === "STORAGE_NOT_CONFIGURED" || code === "STORAGE_LOCAL_FORBIDDEN" || code === "STORAGE_CREDENTIALS_MISSING" || code === "STORAGE_BUCKET_MISSING") {
      return err(msg, 503);
    }
    return err(msg, 500);
  }
}
