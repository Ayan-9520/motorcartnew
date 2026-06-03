import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { resolveLoginRedirect, waitForHydratedUser } from "@/auth/login-redirect";
import { classifyAuthError, getAuthErrorToast } from "@/lib/auth-errors";
import { logAuthActivity, registerDeviceTouch } from "@/services/auth-telemetry.service";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { syncSession } = useAuth();
  const [message, setMessage] = useState("Completing sign in…");

  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorDesc = params.get("error_description");

      if (errorDesc) {
        const authErrorCode = classifyAuthError(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
        toast.error(getAuthErrorToast(authErrorCode));
        navigate("/login", { replace: true });
        return;
      }

      if (code) {
        setMessage("Verifying your email…");
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error && !cancelled) {
          const authErrorCode = classifyAuthError(error.message);
          toast.error(getAuthErrorToast(authErrorCode));
          navigate("/login", { replace: true });
          return;
        }
      }

      if (cancelled) return;

      setMessage("Loading your account…");
      const ok = await syncSession();

      if (cancelled) return;

      if (ok) {
        toast.success("Email verified — welcome!");
        void registerDeviceTouch();
        void logAuthActivity("oauth_callback", { flow: "exchange_or_session" });
        const u = (await waitForHydratedUser()) ?? useAuthStore.getState().user;
        navigate(u ? resolveLoginRedirect(u, {}) : "/dashboard/customer", { replace: true });
      } else {
        setMessage("Could not complete sign-in. Try signing in manually.");
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      }
    }

    void finishAuth();
    return () => {
      cancelled = true;
    };
  }, [navigate, syncSession]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-center text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
