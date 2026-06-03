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

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Only JPEG, PNG, and WebP images are allowed.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be under 10MB.");
  }
}

export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File,
  onProgress?: (pct: number) => void
) {
  if (bucket !== "dealer-documents" && bucket !== "finance-documents") {
    validateImageFile(file);
  }

  onProgress?.(10);
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  onProgress?.(90);
  if (error) throw error;
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
