import { err } from "@/lib/api-response";
import { GrowthQuotaError } from "@/lib/growth/entitlements";

export function handleGrowthServiceError(e: unknown): Response | null {
  if (e instanceof GrowthQuotaError) {
    return err("quota_exceeded", 402);
  }
  if (e instanceof Error && e.message.includes("Unique constraint")) {
    return err("Duplicate key", 409);
  }
  return null;
}

export function pickBody(
  body: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    if (body[key] !== undefined) out[key] = body[key];
    if (body[camel] !== undefined) out[key] = body[camel];
  }
  return out;
}
