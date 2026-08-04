import { apiFetch, clearTokens, getAccessToken, setTokens } from "./client";

export type AuthUser = {
  id: string;
  email: string;
  fullName?: string | null;
  role?: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  status?: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

function normalizeLogin(data: LoginResponse | { data?: LoginResponse }): LoginResponse {
  if (data && typeof data === "object" && "accessToken" in data && (data as LoginResponse).accessToken) {
    return data as LoginResponse;
  }
  const nested = (data as { data?: LoginResponse }).data;
  if (nested?.accessToken) return nested;
  return data as LoginResponse;
}

export async function loginWithEmail(email: string, password: string): Promise<LoginResponse> {
  const raw = await apiFetch<LoginResponse | { data?: LoginResponse }>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  const data = normalizeLogin(raw);
  await setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const data = await apiFetch<{ user?: AuthUser } & AuthUser>("/api/auth/me");
    return (data as { user?: AuthUser }).user ?? (data as AuthUser);
  } catch {
    return null;
  }
}

export type RegisterResponse = {
  accessToken?: string;
  refreshToken?: string;
  user: AuthUser;
  needsEmailConfirmation?: boolean;
};

function normalizeRegister(
  raw: RegisterResponse | { data?: RegisterResponse }
): RegisterResponse {
  if (raw && typeof raw === "object" && "user" in raw && (raw as RegisterResponse).user) {
    return raw as RegisterResponse;
  }
  const nested = (raw as { data?: RegisterResponse }).data;
  if (nested?.user) return nested;
  return raw as RegisterResponse;
}

export async function registerAccount(body: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: string;
  business_signup?: boolean;
  company_name?: string;
  city?: string;
  state?: string;
}): Promise<RegisterResponse> {
  const raw = await apiFetch<RegisterResponse | { data?: RegisterResponse }>("/api/auth/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      full_name: body.full_name.trim(),
      phone: body.phone?.replace(/\D/g, "").slice(-10) || undefined,
      role: body.role ?? "customer",
      business_signup: body.business_signup ?? false,
      company_name: body.company_name?.trim() || undefined,
      city: body.city?.trim() || undefined,
      state: body.state?.trim() || undefined,
    }),
  });
  const data = normalizeRegister(raw);
  if (data.accessToken) {
    await setTokens(data.accessToken, data.refreshToken);
  }
  return data;
}

export async function logout() {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
  await clearTokens();
}

export async function updateProfile(body: {
  fullName?: string;
  phone?: string;
  city?: string;
  state?: string;
}): Promise<AuthUser> {
  const raw = await apiFetch<{ user?: AuthUser } & AuthUser>("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return (raw as { user?: AuthUser }).user ?? (raw as AuthUser);
}
