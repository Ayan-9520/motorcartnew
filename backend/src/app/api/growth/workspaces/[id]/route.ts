import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthAuth } from "@/lib/growth/guard";
import {
  getGrowthWorkspace,
  updateGrowthWorkspace,
} from "@/services/growth-workspace.service";

const ADMIN = new Set(["admin", "super_admin"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthAuth(req, "workspaces");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const row = await getGrowthWorkspace(id, gate.auth.sub, ADMIN.has(gate.auth.role));
  if (!row) return err("Not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthAuth(req, "workspaces");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.metadata != null && typeof body.metadata === "object") data.metadata = body.metadata;
  if (body.subscription_plan_slug != null) {
    data.subscriptionPlanSlug = String(body.subscription_plan_slug);
  }
  if (body.subscription_tier != null) {
    data.subscriptionTier = String(body.subscription_tier);
  }

  const row = await updateGrowthWorkspace(
    id,
    gate.auth.sub,
    ADMIN.has(gate.auth.role),
    data
  );
  if (!row) return err("Not found", 404);
  return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) });
}
