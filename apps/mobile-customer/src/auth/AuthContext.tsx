import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchMe,
  loginWithEmail,
  logout as apiLogout,
  registerAccount,
  type AuthUser,
  type RegisterResponse,
} from "../api/auth";
import { clearTokens, getAccessToken } from "../api/client";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (body: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    business_signup?: boolean;
    company_name?: string;
    city?: string;
  }) => Promise<RegisterResponse>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    const me = await fetchMe();
    if (!me?.id) {
      await clearTokens();
      setUser(null);
    } else {
      setUser(me);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim();
    if (!trimmed || !password) throw new Error("Email and password are required");
    const { user: u } = await loginWithEmail(trimmed, password);
    setUser(u);
  }, []);

  const signUp = useCallback(
    async (body: {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
      business_signup?: boolean;
      company_name?: string;
      city?: string;
    }) => {
      const result = await registerAccount({
        ...body,
        role: body.business_signup ? "dealer" : "customer",
      });
      if (result.accessToken && result.user?.id) {
        setUser(result.user);
      }
      return result;
    },
    []
  );

  const signOut = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, refresh }),
    [user, loading, signIn, signUp, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
