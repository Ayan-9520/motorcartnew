import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getAuthUser } from "@/lib/auth/middleware";
import { ok, err, unauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const bucket = String(form.get("bucket") ?? "uploads");
  const filePath = String(form.get("path") ?? `${Date.now()}`);

  if (!file) return err("No file");

  const uploadDir = path.join(process.env.UPLOAD_DIR ?? "./uploads", bucket);
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const fullPath = path.join(uploadDir, filePath.replace(/\.\./g, ""));
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);

  const publicUrl = `/uploads/${bucket}/${filePath}`;
  await prisma.uploadedFile.create({
    data: {
      userId: auth.sub,
      bucket,
      path: filePath,
      mimeType: file.type,
      size: file.size,
      publicUrl,
    },
  });

  return ok({ path: filePath, publicUrl });
}

export async function DELETE(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const { bucket, paths } = (await req.json()) as { bucket: string; paths: string[] };
  await prisma.uploadedFile.deleteMany({
    where: { bucket, path: { in: paths }, userId: auth.sub },
  });
  return ok({ deleted: true });
}
