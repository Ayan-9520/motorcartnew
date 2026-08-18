import { storageFailure, type StorageResult } from "./storage-types";

export function normalizeMimeType(contentType: string): string {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function validateMimeType(
  contentType: string,
  allowedMimeTypes: readonly string[],
): { valid: true; mime: string } | { valid: false; errorCode: string; errorMessage: string } {
  const mime = normalizeMimeType(contentType);
  if (!mime) {
    return { valid: false, errorCode: "MIME_EMPTY", errorMessage: "Content-Type is required" };
  }
  if (!allowedMimeTypes.includes(mime)) {
    return {
      valid: false,
      errorCode: "MIME_NOT_ALLOWED",
      errorMessage: `Content-Type "${mime}" is not allowed`,
    };
  }
  return { valid: true, mime };
}

export function validateUploadSize(
  byteLength: number,
  maxUploadBytes: number,
): { valid: true } | { valid: false; errorCode: string; errorMessage: string } {
  if (byteLength <= 0) {
    return { valid: false, errorCode: "BODY_EMPTY", errorMessage: "Upload body is empty" };
  }
  if (byteLength > maxUploadBytes) {
    return {
      valid: false,
      errorCode: "FILE_TOO_LARGE",
      errorMessage: `Upload size ${byteLength} exceeds limit ${maxUploadBytes}`,
    };
  }
  return { valid: true };
}

export function validateObjectKey(key: string): StorageResult<void> {
  const trimmed = key.trim();
  if (!trimmed) {
    return storageFailure("KEY_EMPTY", "Object key is required");
  }
  if (trimmed.startsWith("/") || trimmed.includes("..")) {
    return storageFailure("KEY_INVALID", "Object key must be relative and must not contain '..'");
  }
  return { success: true, data: undefined };
}
