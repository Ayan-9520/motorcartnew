import { NextRequest } from "next/server";
import { ok, err, forbidden } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthAuth } from "@/lib/growth/guard";
import {
  getGrowthEntitlements,
  getGrowthWorkspace,
  updateGrowthEntitlements,
} from "@/services/growth-workspace.service";

const ADMIN = new Set(["admin", "super_admin"]);

async function assertWorkspaceOwner(
  workspaceId: string,
  userId: string,
  role: string
) {
  const ws = await getGrowthWorkspace(workspaceId, userId, ADMIN.has(role));
  if (!ws) return null;
  if (ws.ownerUserId !== userId && !ADMIN.has(role)) return null;
  return ws;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthAuth(req, "workspaces");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const ws = await assertWorkspaceOwner(id, gate.auth.sub, gate.auth.role);
  if (!ws) return err("Not found", 404);

  const ent = await getGrowthEntitlements(id);
  return ok({ data: toSnakeRow(ent as unknown as Record<string, unknown>) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireGrowthAuth(req, "workspaces");
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const ws = await assertWorkspaceOwner(id, gate.auth.sub, gate.auth.role);
  if (!ws) return err("Not found", 404);
  if (ws.ownerUserId !== gate.auth.sub && !ADMIN.has(gate.auth.role)) {
    return forbidden();
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const ent = await updateGrowthEntitlements(id, {
    planSlug: body.plan_slug != null ? String(body.plan_slug) : undefined,
    limits: body.limits && typeof body.limits === "object" ? body.limits : undefined,
    usage: body.usage && typeof body.usage === "object" ? body.usage : undefined,
    trialEndsAt:
      body.trial_ends_at === null
        ? null
        : body.trial_ends_at
          ? new Date(String(body.trial_ends_at))
          : undefined,
  });

  return ok({ data: toSnakeRow(ent as unknown as Record<string, unknown>) });
}
