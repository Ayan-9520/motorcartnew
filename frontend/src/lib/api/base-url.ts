/** API base URL — set VITE_API_URL for cross-origin; empty = same-origin /api (Vite proxy or nginx). */
export function getApiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "";
}

/** Same-origin /api is available in dev (Vite proxy) and Docker/production (nginx). */
export function hasConfiguredApi(): boolean {
  return true;
}

/** Join API path with optional explicit base (avoids broken relative URLs in fetch helpers). */
export function joinApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}
