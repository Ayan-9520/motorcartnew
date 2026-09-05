/** In-memory sliding window for route-level rate limits. Process-local only. */

const buckets = new Map<string, number[]>();

export function allowSlidingWindow(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}

export function slidingWindowReset(key?: string) {
  if (key) buckets.delete(key);
  else buckets.clear();
}
