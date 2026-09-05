import { supabase } from "@/integrations/supabase/client";
import { apiAuth } from "@/integrations/api/auth";
import { joinApiUrl } from "@/lib/api/base-url";
import { fetchWithTimeout } from "@/lib/api/with-timeout";
import type { AppRole } from "@/types/database";
import type { DbUser } from "@/types/database";

export type AuthProviderSettings = {
  emailEnabled: boolean;
  phoneEnabled: boolean;
  googleEnabled: boolean;
  signupDisabled: boolean;
  mailerAutoconfirm: boolean;
  emailOtpEnabled: boolean;
  smsConfigured: boolean;
};

/** Trim + lowercase — avoids false "invalid credentials" from stray spaces/caps */
export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

let cachedAuthSettings: AuthProviderSettings | null | undefined;

/** Cached Supabase auth settings (email confirm, providers) */
export async function getAuthSettings(): Promise<AuthProviderSettings | null> {
  if (cachedAuthSettings !== undefined) return cachedAuthSettings;
  cachedAuthSettings = await fetchAuthProviderSettings();
  return cachedAuthSettings;
}

export function requiresEmailConfirmation(settings: AuthProviderSettings | null): boolean {
  if (!settings) return false;
  return !settings.mailerAutoconfirm;
}

export function resetAuthSettingsCache(): void {
  cachedAuthSettings = undefined;
}

export async function fetchAuthProviderSettings(): Promise<AuthProviderSettings | null> {
  try {
    const res = await fetchWithTimeout(joinApiUrl("/api/auth/settings"), undefined, 5000);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      emailEnabled?: boolean;
      phoneEnabled?: boolean;
      googleEnabled?: boolean;
      signupDisabled?: boolean;
      mailerAutoconfirm?: boolean;
      emailOtpEnabled?: boolean;
      smsConfigured?: boolean;
    };
    return {
      emailEnabled: data.emailEnabled ?? true,
      phoneEnabled: data.phoneEnabled ?? false,
      googleEnabled: data.googleEnabled ?? false,
      signupDisabled: data.signupDisabled ?? false,
      mailerAutoconfirm: data.mailerAutoconfirm ?? true,
      emailOtpEnabled: data.emailOtpEnabled ?? false,
      smsConfigured: data.smsConfigured ?? false,
    };
  } catch {
    return null;
  }
}

export type SignUpPayload = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: AppRole;
  /** Business registration — sets pending_verification via DB trigger */
  businessSignup?: boolean;
  companyName?: string;
  city?: string;
  state?: string;
  businessMeta?: Record<string, unknown>;
};

/** PostgREST: .single() returns 406 when 0 rows — use maybeSingle() */
function isNoProfileRowError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "PGRST116" ||
    error.message?.includes("Cannot coerce the result to a single JSON object") === true ||
    error.message?.includes("0 rows") === true
  );
}

export async function fetchUserProfile(userId: string): Promise<DbUser | null> {
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();

  if (error) {
    if (!isNoProfileRowError(error)) {
      console.warn("[auth] fetchUserProfile", error.message);
    }
    return null;
  }
  return (data as DbUser | null) ?? null;
}

/** Create public.users row when auth exists but trigger never ran (legacy signups). */
export async function ensureUserProfile(authUser: {
  id: string;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  user_metadata?: Record<string, unknown>;
}): Promise<DbUser | null> {
  const existing = await fetchUserProfile(authUser.id);
  if (existing) return existing;

  const meta = authUser.user_metadata ?? {};
  const role = (meta.role as AppRole) ?? "customer";
  const fullName =
    (meta.full_name as string) ||
    authUser.email?.split("@")[0] ||
    "User";

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        id: authUser.id,
        email: authUser.email ?? null,
        phone: authUser.phone ?? null,
        full_name: fullName,
        role,
        avatar_url: (meta.avatar_url as string) ?? null,
      },
      { onConflict: "id" }
    )
    .select()
    .maybeSingle();

  if (error) {
    console.warn("[auth] ensureUserProfile", error.message);
    return null;
  }
  return (data as DbUser | null) ?? null;
}

const authRedirectUrl = () =>
  typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

export function isEmailNotConfirmedError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("email not confirmed") ||
    m.includes("email_not_confirmed") ||
    m.includes("email not verified") ||
    m.includes("not verified")
  );
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email: normalizeAuthEmail(email),
    password,
  });
}

function normalizeSignupPhoneDigits(phone?: string): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").slice(-10);
}

export async function signUpWithEmail(payload: SignUpPayload) {
  const phoneDigits = normalizeSignupPhoneDigits(payload.phone);
  return supabase.auth.signUp({
    email: normalizeAuthEmail(payload.email),
    password: payload.password,
    options: {
      emailRedirectTo: authRedirectUrl(),
      data: {
        full_name: payload.fullName.trim(),
        role: payload.role ?? "customer",
        phone: phoneDigits,
        business_signup: payload.businessSignup ?? false,
        company_name: payload.companyName?.trim(),
        city: payload.city?.trim(),
        state: payload.state?.trim(),
        business: payload.businessMeta ?? undefined,
      },
    },
  });
}

export async function resendConfirmationEmail(email: string) {
  return supabase.auth.resend({
    type: "signup",
    email: normalizeAuthEmail(email),
    options: {
      emailRedirectTo: authRedirectUrl(),
    },
  });
}

export async function signInWithPhoneOtp(phone: string) {
  return supabase.auth.signInWithOtp({
    phone,
    options: { channel: "sms" },
  });
}

export async function verifyPhoneOtp(phone: string, token: string) {
  return supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
}

export async function sendEmailLoginOtp(email: string) {
  return apiAuth.sendEmailOtp(normalizeAuthEmail(email));
}

export async function verifyEmailLoginOtp(email: string, code: string) {
  return apiAuth.verifyEmailOtp(normalizeAuthEmail(email), code.trim());
}

export async function verifySignupEmail(email: string, code: string) {
  return apiAuth.verifyEmail(normalizeAuthEmail(email), code.trim());
}

export async function signInWithGoogle() {
  const redirectTo = `${window.location.origin}/auth/callback`;
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(normalizeAuthEmail(email), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export async function signOut() {
  return supabase.auth.signOut({ scope: "global" });
}

export async function updateAuthPassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<DbUser, "full_name" | "phone" | "city" | "state" | "avatar_url" | "company_name">>
) {
  return supabase.from("users").update(updates).eq("id", userId).select().single();
}

export async function submitKyc(
  userId: string,
  kycData: Record<string, unknown>
) {
  return supabase
    .from("users")
    .update({ kyc_status: "submitted", kyc_data: kycData })
    .eq("id", userId)
    .select()
    .single();
}
