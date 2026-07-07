import type { GrowthAssetKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertQuota,
  GrowthQuotaError,
  incrementUsage,
} from "@/lib/growth/entitlements";

const ASSET_KINDS = new Set<GrowthAssetKind>(["image", "video", "logo", "document"]);

export function parseAssetKind(raw: unknown): GrowthAssetKind | null {
  if (raw == null) return null;
  const k = String(raw).toLowerCase() as GrowthAssetKind;
  return ASSET_KINDS.has(k) ? k : null;
}

export function listGrowthAssets(
  workspaceId: string,
  opts: { kind?: GrowthAssetKind; cursor?: string; limit?: number }
) {
  const take = Math.min(opts.limit ?? 50, 100);
  return prisma.growthAsset.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      ...(opts.kind ? { kind: opts.kind } : {}),
      ...(opts.cursor ? { id: { lt: opts.cursor } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function getGrowthAsset(workspaceId: string, id: string) {
  return prisma.growthAsset.findFirst({
    where: { id, workspaceId, deletedAt: null },
  });
}

export async function createGrowthAsset(
  workspaceId: string,
  data: {
    kind: GrowthAssetKind;
    name: string;
    storagePath: string;
    publicUrl: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
    width?: number | null;
    height?: number | null;
    tags?: Prisma.InputJsonValue;
    metadata?: Prisma.InputJsonValue;
  }
) {
  const ent = await assertQuota(workspaceId, "max_assets", "storage_bytes", 0);
  const limits = ent.limits as Record<string, unknown>;
  const maxAssets =
    typeof limits.max_assets === "number" ? limits.max_assets : 100;
  const count = await prisma.growthAsset.count({
    where: { workspaceId, deletedAt: null },
  });
  if (count >= maxAssets) throw new GrowthQuotaError("max_assets");

  const size = data.sizeBytes ?? 0;
  const storageMb =
    typeof limits.storage_mb === "number" ? limits.storage_mb : 512;
  const used =
    typeof (ent.usage as Record<string, unknown>).storage_bytes === "number"
      ? ((ent.usage as Record<string, unknown>).storage_bytes as number)
      : 0;
  if (used + size > storageMb * 1024 * 1024) throw new GrowthQuotaError("storage_mb");

  const asset = await prisma.growthAsset.create({
    data: {
      workspaceId,
      kind: data.kind,
      name: data.name,
      storagePath: data.storagePath,
      publicUrl: data.publicUrl,
      mimeType: data.mimeType ?? null,
      sizeBytes: data.sizeBytes ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      tags: data.tags ?? [],
      metadata: data.metadata ?? {},
    },
  });

  if (size > 0) await incrementUsage(workspaceId, "storage_bytes", size);
  return asset;
}

export async function softDeleteGrowthAsset(workspaceId: string, id: string) {
  const asset = await getGrowthAsset(workspaceId, id);
  if (!asset) return false;
  await prisma.growthAsset.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  if (asset.sizeBytes && asset.sizeBytes > 0) {
    const ent = await prisma.growthWorkspaceEntitlement.findUnique({
      where: { workspaceId },
    });
    if (ent) {
      const usage = { ...(ent.usage as Record<string, number>) };
      usage.storage_bytes = Math.max(0, (usage.storage_bytes ?? 0) - asset.sizeBytes);
      await prisma.growthWorkspaceEntitlement.update({
        where: { workspaceId },
        data: { usage },
      });
    }
  }
  return true;
}
