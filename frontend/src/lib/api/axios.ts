import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getApiBaseUrl } from "@/lib/api/base-url";

const API_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_URL || undefined,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

const TOKEN_KEY = "motorcart_access_token";
const REFRESH_KEY = "motorcart_refresh_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh?: string) {
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const { data } = await axios.post<{ accessToken: string; refreshToken?: string }>(
      `${API_URL}/api/auth/refresh`,
      { refreshToken: refresh }
    );
    setTokens(data.accessToken, data.refreshToken ?? refresh);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken();
      const token = await refreshPromise;
      refreshPromise = null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string })?.message;
    if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
      return "Backend not responding. Start MySQL (XAMPP), then run: npm run dev (backend on :3001, frontend on :3000).";
    }
    if (err.code === "ERR_NETWORK" || err.code === "ECONNREFUSED") {
      return "Cannot reach API at " + (API_URL || "localhost:3001") + ". Start backend: cd backend && npm run dev";
    }
    if (err.response?.status === 500 && !msg) {
      return "Server error during signup. Check backend terminal logs.";
    }
    return msg ?? err.message;
  }
  return err instanceof Error ? err.message : "Request failed";
}
