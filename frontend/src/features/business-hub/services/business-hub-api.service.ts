import { hasConfiguredApi, joinApiUrl } from "@/lib/api/base-url";
import { fetchWithTimeout } from "@/lib/api/with-timeout";
import { getAccessToken } from "@/lib/api/axios";

export type BusinessHubResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };

function enabled() {
  return hasConfiguredApi();
}

export async function fetchBusinessHub(slug: string): Promise<BusinessHubResult<{ data: Record<string, unknown> }>> {
  if (!enabled()) return { ok: false, error: "Business hub disabled", status: 404 };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetchWithTimeout(
      joinApiUrl(`/api/business-hub/${encodeURIComponent(slug)}`),
      { headers },
      5000
    );
    const json = (await res.json().catch(() => ({}))) as { data?: Record<string, unknown>; message?: string };
    if (!res.ok) {
      return { ok: false, error: json.message ?? res.statusText, status: res.status };
    }
    return { ok: true, data: { data: json.data ?? {} }, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error", status: 0 };
  }
}

export function isBusinessHubEnabled() {
  return enabled();
}
