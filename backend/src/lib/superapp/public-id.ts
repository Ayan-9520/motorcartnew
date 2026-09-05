import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateMotorCartPublicId(): string {
  const bytes = randomBytes(8);
  let out = "MC-";
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

export function looksLikePublicId(value: string) {
  return /^MC-[A-HJ-NP-Z2-9]{8}$/.test(value);
}

export function publicIdEncodesPii(value: string, phone?: string | null, email?: string | null) {
  const compact = value.replace(/[^A-Z0-9]/gi, "").toLowerCase();
  if (phone && compact.includes(phone.replace(/\D/g, "").slice(-6))) return true;
  if (email) {
    const local = email.split("@")[0]?.toLowerCase() ?? "";
    if (local.length >= 4 && compact.includes(local.slice(0, 4))) return true;
  }
  return false;
}
