import { apiFetch } from "./client";

/** Best-effort unwrap of Motorcart API JSON shapes */
export function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.users)) return o.users;
    if (Array.isArray(o.dealers)) return o.dealers;
    if (Array.isArray(o.applications)) return o.applications;
    if (Array.isArray(o.leads)) return o.leads;
    if (Array.isArray(o.items)) return o.items;
    if (Array.isArray(o.results)) return o.results;
    if (o.data && typeof o.data === "object") {
      const d = o.data as Record<string, unknown>;
      for (const k of ["data", "users", "dealers", "applications", "leads", "items", "results"]) {
        if (Array.isArray(d[k])) return d[k] as unknown[];
      }
    }
  }
  return [];
}

export function unwrapObject(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>;
    if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) return o.data as Record<string, unknown>;
    return o;
  }
  return {};
}

export async function fetchWorkspaceApi(path: string): Promise<{ rows: unknown[]; raw: unknown; error?: string }> {
  try {
    const raw = await apiFetch<unknown>(path, { auth: true });
    return { rows: unwrapList(raw), raw };
  } catch (e) {
    const message = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Request failed";
    return { rows: [], raw: null, error: message };
  }
}

export async function fetchHealth(): Promise<Record<string, unknown> | null> {
  try {
    return await apiFetch<Record<string, unknown>>("/api/health", { auth: false });
  } catch {
    return null;
  }
}
