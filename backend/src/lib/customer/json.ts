export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  return undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "bigint") return Number(value);
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function daysUntil(iso?: string | Date | null): number | undefined {
  if (!iso) return undefined;
  const t = iso instanceof Date ? iso.getTime() : new Date(iso).getTime();
  if (!Number.isFinite(t)) return undefined;
  return Math.max(0, Math.ceil((t - Date.now()) / 86400000));
}
