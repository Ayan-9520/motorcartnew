import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthAuth } from "@/lib/growth/guard";
import { handleGrowthServiceError } from "@/lib/growth/http";
import { GROWTH_BUSINESS_TYPES } from "@/lib/growth/constants";
import {
  createGrowthWorkspace,
  listGrowthWorkspaces,
  parseGrowthBusinessType,
} from "@/services/growth-workspace.service";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthAuth(req, "workspaces");
  if ("response" in gate) return gate.response;

  const rows = await listGrowthWorkspaces(gate.auth.sub);
  return ok({
    data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireGrowthAuth(req, "workspaces");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const businessType = parseGrowthBusinessType(body.business_type ?? body.businessType);
  if (!name) return err("name is required", 400);
  if (!businessType) {
    return err(`business_type required (${GROWTH_BUSINESS_TYPES.join(", ")})`, 400);
  }

  try {
    const row = await createGrowthWorkspace(gate.auth.sub, {
      name,
      businessType,
      entityId: body.entity_id ? String(body.entity_id) : null,
      subscriptionPlanSlug: body.subscription_plan_slug
        ? String(body.subscription_plan_slug)
        : null,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as object)
          : {},
    });
    return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) }, 201);
  } catch (e) {
    const handled = handleGrowthServiceError(e);
    if (handled) return handled;
    throw e;
  }
}
