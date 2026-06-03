/** API base URL — .env.local first, dev fallback to backend on :3001 */
export function getApiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (import.meta.env.DEV) return "http://localhost:3001";
  return "";
}

export function hasConfiguredApi(): boolean {
  return Boolean(getApiBaseUrl());
}
