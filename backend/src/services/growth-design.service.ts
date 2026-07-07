import type { GrowthDesignFormat, GrowthDesignStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertQuota,
  incrementUsage,
} from "@/lib/growth/entitlements";

const FORMATS = new Set<GrowthDesignFormat>([
  "facebook_post",
  "instagram_post",
  "instagram_story",
  "linkedin_post",
  "banner",
  "poster",
]);

const STATUSES = new Set<GrowthDesignStatus>(["draft", "ready", "archived"]);

export function parseDesignFormat(raw: unknown): GrowthDesignFormat | null {
  if (raw == null) return null;
  const f = String(raw).toLowerCase() as GrowthDesignFormat;
  return FORMATS.has(f) ? f : null;
}

export function parseDesignStatus(raw: unknown): GrowthDesignStatus | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase() as GrowthDesignStatus;
  return STATUSES.has(s) ? s : null;
}

export function listGrowthDesigns(workspaceId: string, status?: GrowthDesignStatus) {
  return prisma.growthDesign.findMany({
    where: {
      workspaceId,
      ...(status ? { status } : { status: { not: "archived" } }),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export function getGrowthDesign(workspaceId: string, id: string) {
  return prisma.growthDesign.findFirst({ where: { id, workspaceId } });
}

export function createGrowthDesign(
  workspaceId: string,
  data: {
    name: string;
    format: GrowthDesignFormat;
    canvasJson?: Prisma.InputJsonValue;
    width?: number;
    height?: number;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return prisma.growthDesign.create({
    data: {
      workspaceId,
      name: data.name,
      format: data.format,
      canvasJson: data.canvasJson ?? { layers: [] },
      width: data.width ?? 1080,
      height: data.height ?? 1080,
      metadata: data.metadata ?? {},
    },
  });
}

export async function updateGrowthDesign(
  workspaceId: string,
  id: string,
  data: Prisma.GrowthDesignUpdateInput
) {
  const existing = await getGrowthDesign(workspaceId, id);
  if (!existing) return null;
  return prisma.growthDesign.update({ where: { id }, data });
}

export async function archiveGrowthDesign(workspaceId: string, id: string) {
  return updateGrowthDesign(workspaceId, id, { status: "archived" });
}

export function listDesignExports(designId: string) {
  return prisma.growthDesignExport.findMany({
    where: { designId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function stubExportGrowthDesign(
  workspaceId: string,
  designId: string,
  publicUrl: string,
  opts: { format?: string; width: number; height: number; sizeBytes?: number }
) {
  await assertQuota(workspaceId, "design_exports_monthly", "design_exports", 1);

  const design = await getGrowthDesign(workspaceId, designId);
  if (!design) return null;

  const row = await prisma.growthDesignExport.create({
    data: {
      designId,
      format: opts.format ?? "png",
      publicUrl,
      width: opts.width,
      height: opts.height,
      sizeBytes: opts.sizeBytes ?? null,
    },
  });

  await incrementUsage(workspaceId, "design_exports", 1);
  await prisma.growthDesign.update({
    where: { id: designId },
    data: { status: "ready" },
  });

  return row;
}
