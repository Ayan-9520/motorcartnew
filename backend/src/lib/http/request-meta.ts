import type { NextRequest } from "next/server";

export function requestIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function requestId(req: NextRequest): string {
  return req.headers.get("x-request-id")?.trim() || crypto.randomUUID();
}

const MAX_Q = 80;

/** Reject wildcard-only / overly long search terms. Empty string means “do not scan”. */
export function sanitizeSearchQuery(raw: unknown): string {
  const q = String(raw ?? "").trim().slice(0, MAX_Q);
  if (!q) return "";
  if (/^[%*_]+$/.test(q)) return "";
  return q.replace(/[%_]/g, " ").replace(/\s+/g, " ").trim();
}

export function boundPage(limitRaw: unknown, offsetRaw: unknown, max = 40) {
  const limit = Math.min(Math.max(Number(limitRaw ?? 20) || 20, 1), max);
  const offset = Math.max(Number(offsetRaw ?? 0) || 0, 0);
  return { limit, offset };
}
