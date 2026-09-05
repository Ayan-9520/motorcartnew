import { supabase } from "@/integrations/supabase/client";

export type StorageBucket =
  | "vehicle-images"
  | "dealer-documents"
  | "profile-images"
  | "auction-images"
  | "service-images"
  | "part-images"
  | "finance-documents"
  | "community-media";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const PASS_THROUGH = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
]);

/** Browser-side HD JPEG when server cannot decode (or for AVIF/HEIC preview decode). */
async function canvasToHdJpeg(file: File, quality = 0.92): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 2560;
    let w = bitmap.width;
    let h = bitmap.height;
    const longest = Math.max(w, h);
    if (longest > maxEdge) {
      const scale = maxEdge / longest;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return null;
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return null;
  }
}

function sniffLooksLikeImage(bytes: Uint8Array): boolean {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }
  // AVIF / HEIC ftyp
  if (bytes.length >= 12) {
    const box = String.fromCharCode(bytes[4]!, bytes[5]!, bytes[6]!, bytes[7]!);
    if (box === "ftyp") return true;
  }
  if (bytes.length >= 6) {
    const g = String.fromCharCode(...bytes.slice(0, 6));
    if (g === "GIF87a" || g === "GIF89a") return true;
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return true;
  return false;
}

/**
 * Accept any common image (JPG/PNG/WebP/AVIF/GIF/BMP/HEIC).
 * Pass through web formats; convert others via canvas so upload always lands as clear HD JPEG when needed.
 */
export async function resolveImageFile(file: File): Promise<File> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be under 15MB.");
  }
  const declared = (file.type || "").toLowerCase();
  if (PASS_THROUGH.has(declared)) {
    return file;
  }

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const looksImage = declared.startsWith("image/") || sniffLooksLikeImage(head);
  if (!looksImage) {
    throw new Error(`“${file.name}” is not a supported image. Use JPG, PNG, WebP, AVIF, GIF, or BMP.`);
  }

  // AVIF / HEIC / GIF / BMP / unknown image/* → HD JPEG via browser when possible
  const converted = await canvasToHdJpeg(file, 0.92);
  if (converted) return converted;

  // Let server sharp handle (e.g. some HEIC) — send original bytes
  return file;
}

export function validateImageFile(file: File) {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be under 15MB.");
  }
  if (file.type && !file.type.startsWith("image/") && file.type !== "application/octet-stream") {
    throw new Error("Only image files are allowed.");
  }
}

export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File,
  onProgress?: (pct: number) => void
) {
  let toUpload = file;
  if (bucket !== "dealer-documents" && bucket !== "finance-documents") {
    toUpload = await resolveImageFile(file);
    if (!/\.(jpe?g|png|webp|avif|gif|bmp|heic)$/i.test(path)) {
      const ext = toUpload.type === "image/png" ? "png" : toUpload.type === "image/webp" ? "webp" : "jpg";
      path = `${path.replace(/\.[^.]+$/, "")}.${ext}`;
    } else if (toUpload.type === "image/jpeg" && !/\.jpe?g$/i.test(path)) {
      path = `${path.replace(/\.[^.]+$/, "")}.jpg`;
    }
  }

  onProgress?.(10);
  const { data, error } = await supabase.storage.from(bucket).upload(path, toUpload, {
    cacheControl: "3600",
    upsert: true,
  });

  onProgress?.(90);
  if (error) throw new Error(error.message || "Image upload failed");
  if (!data?.path) throw new Error("Upload failed");

  const uploaded = data as { path: string; publicUrl?: string };
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uploaded.path);
  onProgress?.(100);
  return { path: uploaded.path, publicUrl: uploaded.publicUrl ?? urlData.publicUrl };
}

export async function uploadMultiple(
  bucket: StorageBucket,
  files: File[],
  pathPrefix: string,
  onProgress?: (index: number, pct: number) => void
) {
  const results: { path: string; publicUrl: string }[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${pathPrefix}/${Date.now()}-${i}.${ext}`;
    const result = await uploadFile(bucket, path, file, (pct) => onProgress?.(i, pct));
    results.push(result);
  }
  return results;
}

export async function removeFile(bucket: StorageBucket, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
