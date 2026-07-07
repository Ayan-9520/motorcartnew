import type { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { getAuthUser } from "@/lib/auth/middleware";
import type { JwtPayload } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { err, unauthorized, forbidden } from "@/lib/api-response";
import { assertWorkspaceAccess, isPendingBusinessAccess } from "@/lib/auth/account-access";
import type { GrowthWorkspace } from "@prisma/client";
import { GROWTH_WORKSPACE_HEADER } from "@/lib/growth/constants";

export type GrowthApiSlice =
  | "workspaces"
  | "assets"
  | "posters"
  | "whatsapp"
  | "whatsappProviders"
  | "socialScheduler"
  | "leads"
  | "leadPipeline";

const SLICE_FLAGS: Record<GrowthApiSlice, () => boolean> = {
  workspaces: () => featureFlags.growthWorkspaces,
  assets: () => featureFlags.growthAssets,
  posters: () => featureFlags.growthPosters,
  whatsapp: () => featureFlags.growthWhatsapp,
  whatsappProviders: () =>
    featureFlags.growthWhatsapp && featureFlags.growthWhatsappProviders,
  socialScheduler: () =>
    featureFlags.growthWorkspaces && featureFlags.growthSocialScheduler,
  leads: () => featureFlags.growthLeads,
  leadPipeline: () => featureFlags.growthLeads && featureFlags.growthLeadPipeline,
};

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

export function isGrowthEnabled(slice: GrowthApiSlice): boolean {
  return featureFlags.growthV2 && SLICE_FLAGS[slice]();
}

export function growthFlagOffResponse(slice: GrowthApiSlice): Response | null {
  if (!isGrowthEnabled(slice)) return err("Not found", 404);
  return null;
}

export function requireGrowthPublic(slice: GrowthApiSlice): { ok: true } | { response: Response } {
  const off = growthFlagOffResponse(slice);
  if (off) return { response: off };
  return { ok: true };
}

export async function requireGrowthAuth(
  req: NextRequest,
  slice: GrowthApiSlice
): Promise<{ auth: JwtPayload } | { response: Response }> {
  const off = growthFlagOffResponse(slice);
  if (off) return { response: off };

  const auth = getAuthUser(req);
  if (!auth) return { response: unauthorized() };

  try {
    const access = await assertWorkspaceAccess(auth);
    if (isPendingBusinessAccess(access)) {
      return { response: forbidden("Account pending admin approval.") };
    }
  } catch {
    return { response: unauthorized() };
  }

  return { auth };
}

export type GrowthWorkspaceContext = {
  auth: JwtPayload;
  workspace: GrowthWorkspace;
};

export function getGrowthWorkspaceId(req: NextRequest): string | null {
  const id = req.headers.get(GROWTH_WORKSPACE_HEADER)?.trim();
  return id || null;
}

async function loadOwnedWorkspace(
  workspaceId: string,
  auth: JwtPayload
): Promise<GrowthWorkspace | null> {
  const ws = await prisma.growthWorkspace.findFirst({
    where: { id: workspaceId, status: { not: "archived" } },
  });
  if (!ws) return null;
  if (ws.ownerUserId === auth.sub) return ws;
  if (ADMIN_ROLES.has(auth.role)) return ws;
  return null;
}

export async function requireGrowthWorkspace(
  req: NextRequest,
  slice: GrowthApiSlice
): Promise<{ ctx: GrowthWorkspaceContext } | { response: Response }> {
  const authGate = await requireGrowthAuth(req, slice);
  if ("response" in authGate) return authGate;

  const workspaceId = getGrowthWorkspaceId(req);
  if (!workspaceId) {
    return { response: err("X-Growth-Workspace-Id header required", 400) };
  }

  const workspace = await loadOwnedWorkspace(workspaceId, authGate.auth);
  if (!workspace) {
    return { response: forbidden("Growth workspace not found or access denied") };
  }

  return { ctx: { auth: authGate.auth, workspace } };
}
