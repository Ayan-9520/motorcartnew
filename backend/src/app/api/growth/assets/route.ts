import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { ok, err } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import { handleGrowthServiceError } from "@/lib/growth/http";
import {
  createGrowthAsset,
  listGrowthAssets,
  parseAssetKind,
} from "@/services/growth-asset.service";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "assets");
  if ("response" in gate) return gate.response;

  const kindRaw = req.nextUrl.searchParams.get("kind");
  const kind = kindRaw ? parseAssetKind(kindRaw) : undefined;
  if (kindRaw && !kind) return err("Invalid kind", 400);

  const rows = await listGrowthAssets(gate.ctx.workspace.id, {
    kind: kind ?? undefined,
    cursor: req.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: req.nextUrl.searchParams.get("limit")
      ? parseInt(req.nextUrl.searchParams.get("limit")!, 10)
      : undefined,
  });

  return ok({
    data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "assets");
  if ("response" in gate) return gate.response;

  const contentType = req.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      const kind = parseAssetKind(form.get("kind") ?? "image");
      const name = String(form.get("name") ?? file?.name ?? "asset").trim();
      if (!file) return err("No file", 400);
      if (!kind) return err("Invalid kind", 400);
      if (kind === "document") return err("Use image, video, or logo for MVP upload", 400);

      const wsId = gate.ctx.workspace.id;
      const ext = path.extname(file.name) || ".bin";
      const fileName = `${Date.now()}${ext}`;
      const relPath = `growth/${wsId}/assets/${fileName}`;
      const uploadDir = path.join(process.env.UPLOAD_DIR ?? "./uploads", `growth/${wsId}/assets`);
      await mkdir(uploadDir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      const fullPath = path.join(uploadDir, fileName);
      await writeFile(fullPath, buffer);

      const publicUrl = `/uploads/${relPath}`;
      const row = await createGrowthAsset(wsId, {
        kind,
        name,
        storagePath: relPath,
        publicUrl,
        mimeType: file.type || null,
        sizeBytes: file.size,
      });
      return ok({ data: toSnakeRow(row as unknown as Record<string, unknown>) }, 201);
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const kind = parseAssetKind(body.kind);
    const name = String(body.name ?? "").trim();
    const storagePath = String(body.storage_path ?? body.storagePath ?? "").trim();
    const publicUrl = String(body.public_url ?? body.publicUrl ?? "").trim();
    if (!kind || !name || !storagePath || !publicUrl) {
      return err("kind, name, storage_path, public_url required", 400);
    }

    const row = await createGrowthAsset(gate.ctx.workspace.id, {
      kind,
      name,
      storagePath,
      publicUrl,
      mimeType: body.mime_type ? String(body.mime_type) : null,
      sizeBytes: body.size_bytes != null ? Number(body.size_bytes) : null,
      width: body.width != null ? Number(body.width) : null,
      height: body.height != null ? Number(body.height) : null,
      tags: Array.isArray(body.tags) ? body.tags : [],
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
