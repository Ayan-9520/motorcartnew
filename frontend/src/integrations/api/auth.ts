import axios from "axios";
import { api, clearTokens, setTokens, apiErrorMessage } from "@/lib/api/axios";

export function emitAuthStateChange(event: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("motorcart:auth", { detail: { event } }));
}

export type ApiAuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  created_at: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

export type ApiSession = {
  access_token: string;
  refresh_token: string;
  user: ApiAuthUser;
};

type AuthResult<T> = { data: T; error: null } | { data: T; error: { message: string } };

function toError(err: unknown): { message: string } {
  return { message: apiErrorMessage(err) };
}

function mapUser(raw: Record<string, unknown>): ApiAuthUser {
  const meta =
    (raw.user_metadata as Record<string, unknown>) ??
    (raw.metadata as Record<string, unknown>) ??
    {};
  return {
    id: String(raw.id),
    email: (raw.email as string) ?? null,
    phone: (raw.phone as string) ?? null,
    created_at: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
    email_confirmed_at: raw.emailVerified
      ? String(raw.emailVerifiedAt ?? raw.createdAt ?? new Date().toISOString())
      : null,
    user_metadata: {
      ...meta,
      full_name: meta.full_name ?? raw.fullName ?? raw.full_name,
      role: meta.role ?? raw.role,
      status: raw.status ?? meta.status,
      approval_status: raw.approvalStatus ?? raw.approval_status ?? meta.approval_status,
    },
  };
}

export const apiAuth = {
  async getSession(): Promise<AuthResult<{ session: ApiSession | null }>> {
    try {
      const { data } = await api.get<{ user: Record<string, unknown>; session: ApiSession | null }>(
        "/api/auth/session"
      );
      if (!data.session && data.user) {
        const token = localStorage.getItem("motorcart_access_token");
        if (token) {
          return {
            data: {
              session: {
                access_token: token,
                refresh_token: localStorage.getItem("motorcart_refresh_token") ?? "",
                user: mapUser(data.user),
              },
            },
            error: null,
          };
        }
      }
      return { data: { session: data.session ?? null }, error: null };
    } catch (err) {
      if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
        clearTokens();
      }
      return { data: { session: null }, error: toError(err) };
    }
  },

  async getUser(): Promise<AuthResult<{ user: ApiAuthUser | null }>> {
    try {
      const { data } = await api.get<{ user: Record<string, unknown> | null }>("/api/auth/me");
      return { data: { user: data.user ? mapUser(data.user) : null }, error: null };
    } catch (err) {
      return { data: { user: null }, error: toError(err) };
    }
  },

  async signInWithPassword(body: { email: string; password: string }) {
    try {
      const { data } = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: Record<string, unknown>;
      }>("/api/auth/login", body);
      setTokens(data.accessToken, data.refreshToken);
      emitAuthStateChange("SIGNED_IN");
      const session: ApiSession = {
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        user: mapUser(data.user),
      };
      return { data: { user: session.user, session }, error: null };
    } catch (err) {
      return { data: { user: null, session: null }, error: toError(err) };
    }
  },

  async signUp(body: {
    email: string;
    password: string;
    options?: { emailRedirectTo?: string; data?: Record<string, unknown> };
  }) {
    try {
      const { data } = await api.post<{
        accessToken?: string;
        refreshToken?: string;
        user: Record<string, unknown>;
        needsEmailConfirmation?: boolean;
      }>("/api/auth/register", {
        email: body.email,
        password: body.password,
        ...body.options?.data,
      });
      if (data.accessToken) {
        setTokens(data.accessToken, data.refreshToken);
        emitAuthStateChange("SIGNED_IN");
      }
      const session =
        data.accessToken && data.refreshToken
          ? {
              access_token: data.accessToken,
              refresh_token: data.refreshToken,
              user: mapUser(data.user),
            }
          : null;
      return { data: { user: mapUser(data.user), session }, error: null };
    } catch (err) {
      return { data: { user: null, session: null }, error: toError(err) };
    }
  },

  async signInWithOtp(body: { phone: string; options?: { channel?: string } }) {
    try {
      await api.post("/api/auth/otp/send", { phone: body.phone });
      return { data: {}, error: null };
    } catch (err) {
      return { data: {}, error: toError(err) };
    }
  },

  async verifyOtp(body: { phone: string; token: string; type: string }) {
    try {
      const { data } = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: Record<string, unknown>;
      }>("/api/auth/otp/verify", { phone: body.phone, otp: body.token });
      setTokens(data.accessToken, data.refreshToken);
      const session: ApiSession = {
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        user: mapUser(data.user),
      };
      return { data: { user: session.user, session }, error: null };
    } catch (err) {
      return { data: { user: null, session: null }, error: toError(err) };
    }
  },

  async signInWithOAuth(body: { provider: string; options?: { redirectTo?: string } }) {
    try {
      const { data } = await api.post<{ url: string }>("/api/auth/oauth", body);
      if (data.url) window.location.href = data.url;
      return { data: {}, error: null };
    } catch (err) {
      return { data: {}, error: toError(err) };
    }
  },

  async resetPasswordForEmail(email: string, _options?: { redirectTo?: string }) {
    try {
      await api.post("/api/auth/forgot-password", { email });
      return { data: {}, error: null };
    } catch (err) {
      return { data: {}, error: toError(err) };
    }
  },

  async updateUser(body: { password?: string }) {
    try {
      await api.post("/api/auth/reset-password", body);
      return { data: { user: null }, error: null };
    } catch (err) {
      return { data: { user: null }, error: toError(err) };
    }
  },

  async resend(body: { type: string; email: string; options?: { emailRedirectTo?: string } }) {
    try {
      await api.post("/api/auth/resend-verification", { email: body.email });
      return { data: {}, error: null };
    } catch (err) {
      return { data: {}, error: toError(err) };
    }
  },

  async signOut(_opts?: { scope?: string }) {
    try {
      await api.post("/api/auth/logout");
    } finally {
      clearTokens();
    }
    return { error: null };
  },

  async refreshSession() {
    const refresh = localStorage.getItem("motorcart_refresh_token");
    if (!refresh) return { data: { session: null }, error: { message: "No refresh token" } };
    try {
      const { data } = await api.post<{ accessToken: string; refreshToken?: string }>(
        "/api/auth/refresh",
        { refreshToken: refresh }
      );
      setTokens(data.accessToken, data.refreshToken ?? refresh);
      return apiAuth.getSession();
    } catch (err) {
      return { data: { session: null }, error: toError(err) };
    }
  },

  async exchangeCodeForSession(code: string) {
    try {
      const { data } = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: Record<string, unknown>;
      }>("/api/auth/oauth/callback", { code });
      setTokens(data.accessToken, data.refreshToken);
      const session: ApiSession = {
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        user: mapUser(data.user),
      };
      return { data: { session }, error: null };
    } catch (err) {
      return { data: { session: null }, error: toError(err) };
    }
  },

  onAuthStateChange(
    callback: (event: string, session: ApiSession | null) => void
  ): { data: { subscription: { unsubscribe: () => void } } } {
    let cancelled = false;

    const emit = async (event: string) => {
      const { data } = await apiAuth.getSession();
      if (!cancelled) callback(event, data.session);
    };

    void emit("INITIAL_SESSION");

    const onStorage = (e: StorageEvent) => {
      if (e.key === "motorcart_access_token") void emit("TOKEN_REFRESHED");
    };
    const onAuthEvent = (e: Event) => {
      const ev = (e as CustomEvent<{ event?: string }>).detail?.event ?? "TOKEN_REFRESHED";
      void emit(ev);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("motorcart:auth", onAuthEvent);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            cancelled = true;
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("motorcart:auth", onAuthEvent);
          },
        },
      },
    };
  },
};
