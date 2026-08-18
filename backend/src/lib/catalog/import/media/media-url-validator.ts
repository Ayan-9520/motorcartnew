import { isValidHttpUrl } from "../validation/validation-rules";

export type UrlValidationResult =
  | { valid: true; normalizedUrl: string }
  | { valid: false; errorCode: string; errorMessage: string };

export function validateMediaUrl(url: string): UrlValidationResult {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, errorCode: "URL_EMPTY", errorMessage: "URL is empty" };
  }
  if (!isValidHttpUrl(trimmed)) {
    return { valid: false, errorCode: "URL_INVALID", errorMessage: "URL must use http or https" };
  }
  return { valid: true, normalizedUrl: trimmed };
}

export function parseMultiValueUrls(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[|,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}
