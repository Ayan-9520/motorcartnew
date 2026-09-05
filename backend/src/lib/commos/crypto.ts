import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function maskRecipient(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function hmacHex(secret: string, body: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function hmacValid(secret: string, body: string, signature: string) {
  const expected = Buffer.from(hmacHex(secret, body));
  const got = Buffer.from(String(signature));
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}

export function detectLanguage(text: string): "hi-IN" | "en-IN" {
  if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
  if (/\b(chahiye|kitna|gaadi|loan|emi)\b/i.test(text)) return "hi-IN";
  return "en-IN";
}
