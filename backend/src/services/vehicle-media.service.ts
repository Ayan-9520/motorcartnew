import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { SuperAppError } from "@/lib/superapp/errors";
import { applyFileWatermark, sha256Hex } from "@/lib/superapp/watermark";
import type { SuperActor } from "@/lib/superapp/http";
import { isAdminRole } from "@/lib/superapp/http";
import type { Prisma } from "@prisma/client";

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "video/mp4", "image/webp"]);
const MAX_BYTES = 12 * 1024 * 1024;

function uploadRoot() {
  return process.env.UPLOAD_DIR ?? "./uploads";
}

export async function registerMediaAsset(
  actor: SuperActor,
  input: {
    buffer: Buffer;
    mimeType: string;
    mediaType: "IMAGE" | "VIDEO" | "VIEW_360";
    vehicleId?: string;
    saleRequestId?: string;
    plateMaskRegions?: Array<{ x: number; y: number; w: number; h: number }>;
  },
) {
  const mime = input.mimeType.toLowerCase();
  if (!ALLOWED_MIME.has(mime)) throw new SuperAppError("Unsupported media type", 400, "INVALID_MIME");
  if (input.buffer.length > MAX_BYTES) throw new SuperAppError("File too large", 400, "FILE_TOO_LARGE");
  if (input.saleRequestId) {
    const sale = await prisma.vehicleSaleRequest.findUnique({ where: { id: input.saleRequestId } });
    if (!sale || sale.customerUserId !== actor.userId) throw new SuperAppError("Forbidden", 403, "CROSS_TENANT");
  }
  const checksum = sha256Hex(input.buffer);
  const ext = mime.includes("png") ? "png" : mime.includes("mp4") ? "mp4" : mime.includes("webp") ? "webp" : "jpg";
  const rel = `media/${actor.userId}/${Date.now()}-${checksum.slice(0, 10)}.${ext}`;
  const full = path.join(uploadRoot(), rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, input.buffer);
  const plate = input.plateMaskRegions?.length ? "MASKED" : input.mediaType === "IMAGE" ? "PENDING" : "NOT_REQUIRED";
  const asset = await prisma.vehicleMediaAsset.create({
    data: {
      vehicleId: input.vehicleId,
      saleRequestId: input.saleRequestId,
      uploaderUserId: actor.userId,
      mediaType: input.mediaType,
      originalPath: rel,
      originalUrl: `/uploads/${rel}`,
      mimeType: mime,
      size: input.buffer.length,
      checksum,
      platePrivacyStatus: plate,
      authenticityStatus: "UPLOADED",
      processingState: "PENDING",
      metadata: { plateMaskRegions: input.plateMaskRegions ?? [], source: "motorcart_upload" } as Prisma.InputJsonValue,
    },
  });
  return processMediaAsset(actor, asset.id);
}

export async function processMediaAsset(actor: SuperActor, id: string) {
  const asset = await prisma.vehicleMediaAsset.findUnique({ where: { id } });
  if (!asset) throw new SuperAppError("Media not found", 404, "NOT_FOUND");
  if (asset.uploaderUserId !== actor.userId && !isAdminRole(actor.role)) {
    throw new SuperAppError("Forbidden", 403, "CROSS_TENANT");
  }
  if (asset.processingState === "PROCESSED" && asset.processedPath) return asset;
  const originalFull = path.join(uploadRoot(), asset.originalPath);
  const original = await readFile(originalFull);
  try {
    if (asset.mediaType === "VIDEO") {
      return prisma.vehicleMediaAsset.update({
        where: { id },
        data: {
          processingState: "PROCESSED",
          watermarkStatus: "NOT_APPLICABLE",
          processedAt: new Date(),
          processedPath: asset.originalPath,
          processedUrl: asset.originalUrl,
        },
      });
    }
    const processed = applyFileWatermark(original, asset.mimeType);
    const rel = asset.originalPath.replace(/(\.[a-z0-9]+)$/i, ".wm$1");
    const full = path.join(uploadRoot(), rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, processed);
    return prisma.vehicleMediaAsset.update({
      where: { id },
      data: {
        processingState: "PROCESSED",
        watermarkStatus: "APPLIED",
        processedAt: new Date(),
        processedPath: rel,
        processedUrl: `/uploads/${rel}`,
        authenticityStatus: "UPLOADED",
      },
    });
  } catch {
    return prisma.vehicleMediaAsset.update({
      where: { id },
      data: { processingState: "FAILED", watermarkStatus: "FAILED" },
    });
  }
}

export async function reviewMediaAuthenticity(actor: SuperActor, id: string, status: "REVIEWED" | "VERIFIED" | "REJECTED") {
  if (!isAdminRole(actor.role)) throw new SuperAppError("Forbidden", 403, "FORBIDDEN");
  return prisma.vehicleMediaAsset.update({ where: { id }, data: { authenticityStatus: status } });
}

export async function publicSafeMedia(asset: { processedUrl?: string | null; originalUrl: string; authenticityStatus: string; uploaderUserId: string }) {
  return {
    url: asset.processedUrl ?? asset.originalUrl,
    authenticityStatus: asset.authenticityStatus,
    originalHidden: true,
  };
}

export function assertNotDocumentMime(mime: string) {
  if (mime.includes("pdf") || mime.includes("msword")) {
    throw new SuperAppError("Documents are not listing media", 400, "DOCUMENT_NOT_MEDIA");
  }
}
