import { useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  ensureUserProfile,
  signInWithEmail,
  signUpWithEmail,
  resendConfirmationEmail,
  getAuthSettings,
  requiresEmailConfirmation,
  signInWithPhoneOtp,
  verifyPhoneOtp,
  sendEmailLoginOtp,
  verifyEmailLoginOtp,
  verifySignupEmail,
  signInWithGoogle,
  resetPassword,
  signOut as authSignOut,
  normalizeAuthEmail,
  type SignUpPayload,
} from "@/services/auth.service";
import {
  classifyAuthError,
  getAuthErrorToast,
  getAuthErrorUI,
  type AuthErrorCode,
  type AuthErrorUI,
} from "@/lib/auth-errors";
import { enrichUserWithDealerContext } from "@/auth/enrich-user-dealer";
import { mapAuthSessionToAppUser, mapDbUserToAppUser } from "@/services/mapUser";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/database";
import toast from "react-hot-toast";
import { setIntentionalSignOut } from "@/lib/auth-session-flag";
import { clearLegacyAuthStorage } from "@/lib/clear-auth-storage";
import { logAuthActivity, registerDeviceTouch } from "@/services/auth-telemetry.service";

export function useAuth() {
  const { user, isLoading, isAuthenticated, setUser, setProfileHydrated, logout } =
    useAuthStore();

  const loadProfile = useCallback(
    async (
      _userId: string,
      authUser?: {
        id: string;
        email?: string | null;
        phone?: string | null;
        created_at: string;
        email_confirmed_at?: string | null;
        user_metadata?: Record<string, unknown>;
      }
    ): Promise<boolean> => {
      if (!authUser) return false;

      const profile = await ensureUserProfile(authUser);
      if (profile) {
        const mapped = mapDbUserToAppUser(profile);
        setUser(await enrichUserWithDealerContext(mapped));
      } else {
        const { data: { user: au } } = await supabase.auth.getUser();
        if (au) {
          const mapped = mapAuthSessionToAppUser(au as Parameters<typeof mapAuthSessionToAppUser>[0]);
          setUser(await enrichUserWithDealerContext(mapped));
        }
      }
      setProfileHydrated(true);
      return true;
    },
    [setUser, setProfileHydrated]
  );

  const syncSession = useCallback(async (): Promise<boolean> => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      setUser(null);
      return false;
    }

    if (session?.user) {
      return loadProfile(session.user.id, session.user as Parameters<typeof loadProfile>[1]);
    }
    setUser(null);
    return false;
  }, [loadProfile, setUser]);

  const loginEmail = useCallback(
    async (email: string, password: string) => {
      const settings = await getAuthSettings();
      const needsConfirm = requiresEmailConfirmation(settings);

      const { data, error } = await signInWithEmail(email, password);

      if (error) {
        const errorCode = classifyAuthError(error.message, {
          requiresEmailConfirmation: needsConfirm,
        });
        const errorUI = getAuthErrorUI(errorCode, error.message);
        toast.error(getAuthErrorToast(errorCode), { duration: 5000 });

        return {
          error,
          errorCode,
          errorUI,
          success: false as const,
        };
      }

      if (data.session?.user) {
        const sessionUser = data.session.user;
        const authUser = sessionUser as NonNullable<Parameters<typeof loadProfile>[1]>;
        try {
          await loadProfile(sessionUser.id, authUser);
        } catch (profileErr) {
          console.warn("[auth] profile hydrate after login", profileErr);
          const mapped = mapAuthSessionToAppUser(sessionUser);
          setUser(await enrichUserWithDealerContext(mapped));
          setProfileHydrated(true);
        }
        void registerDeviceTouch();
        void logAuthActivity("sign_in", { channel: "email" });
      }

      toast.success("Welcome back!");
      return {
        error: null,
        errorCode: null,
        errorUI: null,
        success: true as const,
      };
    },
    [loadProfile, setUser, setProfileHydrated]
  );

  const register = useCallback(async (payload: SignUpPayload) => {
    const { data, error } = await signUpWithEmail(payload);

    if (error) {
      const errorCode = classifyAuthError(error.message);
      toast.error(getAuthErrorToast(errorCode, "signup"));
      return {
        data,
        error,
        errorCode,
        errorUI: getAuthErrorUI(errorCode, error.message),
        needsEmailConfirmation: false,
      };
    }

    if (data.session?.user) {
      await loadProfile(data.session.user.id, data.session.user as Parameters<typeof loadProfile>[1]);
      void registerDeviceTouch();
      void logAuthActivity("sign_up", { role: String(payload.role ?? "customer") });
      toast.success("Account created — welcome!");
      return { data, error: null, errorCode: null, errorUI: null, needsEmailConfirmation: false };
    }

    toast.success("Verification email sent — check inbox (code valid 48 hours)");
    return { data, error: null, errorCode: null, errorUI: null, needsEmailConfirmation: true };
  }, [loadProfile]);

  const resendEmailConfirmation = useCallback(async (email: string) => {
    const { error } = await resendConfirmationEmail(email);
    if (error) {
      const errorCode = classifyAuthError(error.message);
      toast.error(getAuthErrorToast(errorCode));
      return { error, errorCode, errorUI: getAuthErrorUI(errorCode, error.message) };
    }
    toast.success("Verification email sent — check your inbox and spam folder");
    return { error: null, errorCode: null, errorUI: null };
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    const formatted = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
    const { error } = await signInWithPhoneOtp(formatted);
    if (error) {
      const errorCode = classifyAuthError(error.message);
      toast.error(getAuthErrorToast(errorCode));
    } else {
      toast.success("OTP sent to your phone");
    }
    return { error, phone: formatted };
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const { data, error } = await verifyPhoneOtp(phone, token);
    if (error) {
      const errorCode = classifyAuthError(error.message);
      toast.error(getAuthErrorToast(errorCode));
      return { error };
    }
    if (data.session?.user) {
      await loadProfile(data.session.user.id, data.session.user as Parameters<typeof loadProfile>[1]);
      void registerDeviceTouch();
      void logAuthActivity("phone_otp", {});
    }
    toast.success("Phone verified — welcome!");
    return { error: null };
  }, [loadProfile]);

  const sendEmailOtp = useCallback(async (email: string) => {
    const normalized = normalizeAuthEmail(email);
    const { error } = await sendEmailLoginOtp(normalized);
    if (error) {
      const errorCode = classifyAuthError(error.message);
      toast.error(getAuthErrorToast(errorCode));
      return { error };
    }
    toast.success("Login code sent — check your email (valid 10 minutes)");
    return { error: null };
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, code: string) => {
    const { data, error } = await verifyEmailLoginOtp(normalizeAuthEmail(email), code);
    if (error) {
      const errorCode = classifyAuthError(error.message);
      toast.error(getAuthErrorToast(errorCode));
      return { error };
    }
    if (data.session?.user) {
      await loadProfile(data.session.user.id, data.session.user as Parameters<typeof loadProfile>[1]);
      void registerDeviceTouch();
      void logAuthActivity("email_otp", {});
    }
    toast.success("Signed in with email code");
    return { error: null };
  }, [loadProfile]);

  const confirmSignupEmail = useCallback(async (email: string, code: string) => {
    const { data, error } = await verifySignupEmail(normalizeAuthEmail(email), code);
    if (error) {
      const errorCode = classifyAuthError(error.message);
      toast.error(getAuthErrorToast(errorCode));
      return { error };
    }
    if (data.session?.user) {
      await loadProfile(data.session.user.id, data.session.user as Parameters<typeof loadProfile>[1]);
      void registerDeviceTouch();
      void logAuthActivity("email_verify", {});
    }
    toast.success("Email verified — welcome!");
    return { error: null };
  }, [loadProfile]);

  const loginGoogle = useCallback(async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      const errorCode = classifyAuthError(error.message);
      toast.error(getAuthErrorToast(errorCode));
    }
    return { error };
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const normalized = normalizeAuthEmail(email);
    if (!normalized) {
      toast.error("Enter a valid email address");
      return { error: new Error("invalid email") };
    }
    const { error } = await resetPassword(normalized);
    if (error) {
      const errorCode = classifyAuthError(error.message);
      toast.error(getAuthErrorToast(errorCode));
    } else {
      toast.success("Password reset link sent — check your email");
    }
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    const uid = useAuthStore.getState().user?.id;
    setIntentionalSignOut(true);
    if (uid) {
      await logAuthActivity("sign_out", {}).catch(() => {});
    }
    await authSignOut();
    clearLegacyAuthStorage();
    logout();
    toast.success("Signed out");
  }, [logout]);

  return {
    user,
    isLoading,
    isAuthenticated,
    loginEmail,
    register,
    resendEmailConfirmation,
    sendOtp,
    verifyOtp,
    sendEmailOtp,
    verifyEmailOtp,
    confirmSignupEmail,
    loginGoogle,
    forgotPassword,
    signOut,
    syncSession,
    refreshProfile: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) await loadProfile(authUser.id, authUser as Parameters<typeof loadProfile>[1]);
    },
  };
}

export type { AuthErrorCode, AuthErrorUI };
