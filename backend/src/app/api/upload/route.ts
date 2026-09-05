import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getAuthUser } from "@/lib/auth/middleware";
import { ok, err, unauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { normalizeUploadImage, sniffUploadMime } from "@/lib/upload/normalize-image";

const MAX_BYTES = 15 * 1024 * 1024;
const PRIVATE_BUCKETS = new Set(["documents", "kyc", "recordings", "private"]);

function safeSegment(raw: string) {
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "");
  if (!cleaned || cleaned.includes("..")) return "";
  return cleaned.slice(0, 80);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const bucket = safeSegment(String(form.get("bucket") ?? "uploads")) || "uploads";
  if (!file) return err("No file");
  if (file.size > MAX_BYTES) return err("File too large (max 15MB)", 413);

  const raw = Buffer.from(await file.arrayBuffer());
  const declared = (file.type || "").toLowerCase();
  const sniffed = sniffUploadMime(raw);

  // PDFs (documents) — store as-is
  if (declared === "application/pdf" || sniffed === "application/pdf") {
    const requested = String(form.get("path") ?? `${Date.now()}`);
    const base = path.basename(requested).replace(/\.\./g, "");
    const stem = safeSegment(base.replace(/\.[^.]+$/, "")) || String(Date.now());
    const filePath = `${stem}.pdf`;
    const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
    const uploadDir = path.join(uploadRoot, bucket);
    await mkdir(uploadDir, { recursive: true });
    const fullPath = path.resolve(uploadDir, filePath);
    if (fullPath !== uploadDir && !fullPath.startsWith(uploadDir + path.sep)) {
      return err("Invalid path", 400);
    }
    await writeFile(fullPath, raw);
    const isPrivate = PRIVATE_BUCKETS.has(bucket);
    const publicUrl = isPrivate ? "" : `/uploads/${bucket}/${filePath}`;
    await prisma.uploadedFile.create({
      data: {
        userId: auth.sub,
        bucket,
        path: filePath,
        mimeType: "application/pdf",
        size: raw.length,
        publicUrl: publicUrl || `/api/media/private/${bucket}/${filePath}`,
      },
    });
    return ok({ path: filePath, publicUrl: publicUrl || null, private: isPrivate });
  }

  let normalized;
  try {
    normalized = await normalizeUploadImage(raw, declared || sniffed || undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Unsupported image type", 415);
  }

  const requested = String(form.get("path") ?? `${Date.now()}`);
  const base = path.basename(requested).replace(/\.\./g, "");
  const stem = safeSegment(base.replace(/\.[^.]+$/, "")) || String(Date.now());
  const filePath = `${stem}${normalized.ext}`;

  const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
  const uploadDir = path.join(uploadRoot, bucket);
  await mkdir(uploadDir, { recursive: true });
  const fullPath = path.resolve(uploadDir, filePath);
  if (fullPath !== uploadDir && !fullPath.startsWith(uploadDir + path.sep)) {
    return err("Invalid path", 400);
  }
  await writeFile(fullPath, normalized.buffer);

  const isPrivate = PRIVATE_BUCKETS.has(bucket);
  const publicUrl = isPrivate ? "" : `/uploads/${bucket}/${filePath}`;
  await prisma.uploadedFile.create({
    data: {
      userId: auth.sub,
      bucket,
      path: filePath,
      mimeType: normalized.mime,
      size: normalized.buffer.length,
      publicUrl: publicUrl || `/api/media/private/${bucket}/${filePath}`,
    },
  });

  return ok({
    path: filePath,
    publicUrl: publicUrl || null,
    private: isPrivate,
  });
}

export async function DELETE(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const { bucket, paths } = (await req.json()) as { bucket: string; paths: string[] };
  const safeBucket = safeSegment(bucket);
  const safePaths = (paths ?? []).map((p) => path.basename(p)).filter(Boolean);
  await prisma.uploadedFile.deleteMany({
    where: { bucket: safeBucket, path: { in: safePaths }, userId: auth.sub },
  });
  return ok({ deleted: true });
}
