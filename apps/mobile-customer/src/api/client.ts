import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { API_BASE_URL } from "../config";

const ACCESS_KEY = "motorcart_access_token";
const REFRESH_KEY = "motorcart_refresh_token";

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function storageDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getAccessToken() {
  return storageGet(ACCESS_KEY);
}

export async function getRefreshToken() {
  return storageGet(REFRESH_KEY);
}

export async function setTokens(access: string, refresh?: string) {
  await storageSet(ACCESS_KEY, access);
  if (refresh) await storageSet(REFRESH_KEY, refresh);
}

export async function clearTokens() {
  await storageDelete(ACCESS_KEY);
  await storageDelete(REFRESH_KEY);
}

export type ApiError = { message: string; status?: number };

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return false;
    try {
      const url = `${API_BASE_URL}/api/auth/refresh`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const json = (await res.json().catch(() => null)) as {
        accessToken?: string;
        refreshToken?: string;
        message?: string;
      } | null;
      if (!res.ok || !json?.accessToken) {
        await clearTokens();
        return false;
      }
      await setTokens(json.accessToken, json.refreshToken ?? refreshToken);
      return true;
    } catch {
      await clearTokens();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean; _retried?: boolean } = {}
): Promise<T> {
  const { auth = true, headers, _retried, ...rest } = options;
  const h = new Headers(headers);
  if (!h.has("Content-Type") && rest.body) h.set("Content-Type", "application/json");
  if (auth) {
    const token = await getAccessToken();
    if (token) h.set("Authorization", `Bearer ${token}`);
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, { ...rest, headers: h });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text || res.statusText };
  }

  if (res.status === 401 && auth && !_retried) {
    const ok = await tryRefreshSession();
    if (ok) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
  }

  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "message" in json && (json as { message: unknown }).message != null
        ? String((json as { message: unknown }).message)
        : `Request failed (${res.status})`;
    const err: ApiError = { message: msg, status: res.status };
    throw err;
  }

  return json as T;
}
