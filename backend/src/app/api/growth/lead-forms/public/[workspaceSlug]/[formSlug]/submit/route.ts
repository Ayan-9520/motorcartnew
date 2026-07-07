import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthPublic } from "@/lib/growth/guard";
import { handleGrowthServiceError } from "@/lib/growth/http";
import type { Prisma } from "@prisma/client";
import {
  checkPublicSubmitRate,
  getPublicLeadForm,
  submitPublicLead,
} from "@/services/growth-lead-form.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string; formSlug: string }> }
) {
  const gate = requireGrowthPublic("leads");
  if ("response" in gate) return gate.response;

  const { workspaceSlug, formSlug } = await params;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkPublicSubmitRate(ip)) {
    return err("Too many submissions", 429);
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = (
    body.payload && typeof body.payload === "object" ? body.payload : body
  ) as Prisma.InputJsonValue;

  try {
    const pub = await getPublicLeadForm(workspaceSlug, formSlug);
    const event = await submitPublicLead(workspaceSlug, formSlug, payload, {
      ip,
      userAgent: req.headers.get("user-agent"),
    });
    if (!event) return err("Not found", 404);
    return ok(
      {
        data: toSnakeRow(event as unknown as Record<string, unknown>),
        thank_you_url: pub?.form.thankYouUrl ?? null,
      },
      201
    );
  } catch (e) {
    const handled = handleGrowthServiceError(e);
    if (handled) return handled;
    throw e;
  }
}
