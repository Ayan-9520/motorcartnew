import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { catalogAdminOffResponse } from "@/lib/catalog/guard";
import { catalogImportStartBodySchema } from "@/lib/catalog/import/catalog-import-admin.validation";
import { catalogImportAdminService } from "@/services/catalog-import-admin.service";

export async function POST(req: NextRequest) {
  const off = catalogAdminOffResponse();
  if (off) return off;

  try {
    requirePlatformAdmin(req);
    const body = catalogImportStartBodySchema.parse(await req.json());
    const started = catalogImportAdminService.start(body);
    return ok(started, 202);
  } catch (e) {
    if (e instanceof ZodError) {
      return err(e.errors.map((issue) => issue.message).join("; "), 400);
    }
    const msg = e instanceof Error ? e.message : "Failed to start import job";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return err(msg, 500);
  }
}
