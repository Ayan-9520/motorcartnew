import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Phone, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { fetchAuthProviderSettings, normalizeAuthEmail } from "@/services/auth.service";
import { AuthStatusAlert } from "@/components/auth/AuthStatusAlert";
import { AuthFormField } from "@/components/auth/AuthFormField";
import type { AuthErrorUI } from "@/lib/auth-errors";
import { useAuthStore } from "@/store/authStore";
import { resolveLoginRedirect, waitForHydratedUser } from "@/auth/login-redirect";
import { getWorkspaceHomePath } from "@/auth/workspace-redirect";

const emailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type EmailForm = z.infer<typeof emailSchema>;

interface AuthFormProps {
  onSuccess?: () => void;
  defaultTab?: "email" | "phone";
  /** Hide signup links when used on dedicated /login page */
  showSignupLinks?: boolean;
  compact?: boolean;
}

export function AuthForm({
  onSuccess,
  defaultTab = "email",
  showSignupLinks = true,
  compact = false,
}: AuthFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const redirectParam = new URLSearchParams(location.search).get("redirect");

  const {
    loginEmail,
    sendOtp,
    verifyOtp,
    loginGoogle,
    resendEmailConfirmation,
    isLoading,
    isAuthenticated,
  } = useAuth();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [formattedPhone, setFormattedPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [loginError, setLoginError] = useState<AuthErrorUI | null>(null);
  const [attemptedEmail, setAttemptedEmail] = useState("");
  const [providers, setProviders] = useState<{
    phone: boolean;
    google: boolean;
    needsEmailConfirm: boolean;
  } | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem("motorcart_remember_me") !== "0";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    fetchAuthProviderSettings()
      .then((s) => {
        if (!s) return;
        setProviders({
          phone: s.phoneEnabled,
          google: s.googleEnabled,
          needsEmailConfirm: !s.mailerAutoconfirm,
        });
      })
      .finally(() => setSettingsLoading(false));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    mode: "onBlur",
  });

  const clearLoginError = () => setLoginError(null);

  const goToWorkspace = async () => {
    const u = (await waitForHydratedUser()) ?? useAuthStore.getState().user;
    if (!u) return;
    const dest = resolveLoginRedirect(u, { from, redirectParam });
    navigate(dest, { replace: true, state: undefined });
  };

  const onEmailSubmit = async (data: EmailForm) => {
    setSubmitting(true);
    setLoginError(null);
    const email = normalizeAuthEmail(data.email);
    setAttemptedEmail(email);

    const result = await loginEmail(email, data.password);
    setSubmitting(false);

    if (!result.success) {
      if (result.errorUI) setLoginError(result.errorUI);
      return;
    }

    try {
      localStorage.setItem("motorcart_remember_me", rememberMe ? "1" : "0");
    } catch {
      /* ignore */
    }

    onSuccess?.();
    await goToWorkspace();
  };

  const onResendVerification = async () => {
    if (!attemptedEmail) return;
    setResending(true);
    const { errorUI } = await resendEmailConfirmation(attemptedEmail);
    setResending(false);
    if (!errorUI) {
      setLoginError({
        code: "email_not_verified",
        title: "Verification email sent",
        description: "Open the new link we sent, then return here to sign in.",
        variant: "info",
        showResendVerification: true,
      });
    }
  };

  const onSendOtp = async () => {
    setSubmitting(true);
    const { error, phone: p } = await sendOtp(phone);
    setSubmitting(false);
    if (!error && p) {
      setFormattedPhone(p);
      setOtpSent(true);
    }
  };

  const onVerifyOtp = async () => {
    setSubmitting(true);
    const { error } = await verifyOtp(formattedPhone, otp);
    setSubmitting(false);
    if (!error) {
      onSuccess?.();
      await goToWorkspace();
    }
  };

  const busy = submitting || isLoading;
  const signedInUser = useAuthStore((s) => s.user);
  const dashboardHref = signedInUser ? getWorkspaceHomePath(signedInUser) : "/dashboard/customer";

  return (
    <Tabs defaultValue={defaultTab} className={cn("auth-form w-full", compact && "auth-form--compact")}>
      {settingsLoading ? (
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground" aria-busy="true">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading sign-in options…
        </div>
      ) : (
        providers?.needsEmailConfirm && (
          <p className="auth-form__notice mb-3 rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Email verification is required before you can sign in. Check spam if you don&apos;t see our email.
          </p>
        )
      )}

      {providers?.phone === true && (
        <TabsList className="auth-form__tabs mb-4 grid h-10 w-full grid-cols-2 rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="email" className="rounded-lg text-xs font-semibold">
            Email
          </TabsTrigger>
          <TabsTrigger value="phone" className="rounded-lg text-xs font-semibold">
            Phone OTP
          </TabsTrigger>
        </TabsList>
      )}

      <TabsContent value="email" className="mt-0 space-y-4">
        {loginError && (
          <AuthStatusAlert
            error={loginError}
            email={attemptedEmail}
            onResendVerification={onResendVerification}
            resending={resending}
          />
        )}

        {isAuthenticated && signedInUser && (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm">
            <p className="font-medium text-foreground">You&apos;re already signed in</p>
            <Button type="button" size="sm" className="auth-cta mt-2 w-full" asChild>
              <Link to={dashboardHref}>Open my workspace</Link>
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit(onEmailSubmit)} className="auth-form__fields space-y-3" noValidate>
          <AuthFormField
            id="login-email"
            label="Email address"
            type="email"
            autoComplete="email"
            disabled={busy}
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register("email", { onChange: clearLoginError })}
          />
          <AuthFormField
            id="login-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            disabled={busy}
            icon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            {...register("password", { onChange: clearLoginError })}
          />
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Remember me on this device
          </label>
          <Button type="submit" className="auth-cta w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="text-center text-sm">
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </p>
      </TabsContent>

      {providers?.phone === true && (
        <TabsContent value="phone" className="mt-0 space-y-4">
          {!otpSent ? (
            <>
              <div className="auth-field">
                <Label htmlFor="login-phone" className="auth-field__label">
                  Mobile number
                </Label>
                <div className="auth-field__control mt-1.5">
                  <span className="auth-field__icon">
                    <Phone className="h-4 w-4" />
                  </span>
                  <Input
                    id="login-phone"
                    className="auth-field__input"
                    placeholder="9876543210"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>
              <Button
                type="button"
                className="auth-cta w-full"
                disabled={busy || phone.replace(/\D/g, "").length < 10}
                onClick={onSendOtp}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                Send OTP
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                OTP sent to <strong className="text-foreground">{formattedPhone}</strong>
              </p>
              <div className="auth-field">
                <Label htmlFor="login-otp" className="auth-field__label">
                  Enter OTP
                </Label>
                <Input
                  id="login-otp"
                  className="mt-1.5 h-11 rounded-xl"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                  disabled={busy}
                />
              </div>
              <Button
                type="button"
                className="auth-cta w-full"
                disabled={busy || otp.length < 4}
                onClick={onVerifyOtp}
              >
                Verify & sign in
              </Button>
            </>
          )}
        </TabsContent>
      )}

      {providers?.google === true && (
        <>
          <div className="auth-form__divider relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/70" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-card px-3 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-border/80"
            onClick={() => loginGoogle()}
            disabled={busy}
          >
            Continue with Google
          </Button>
        </>
      )}

      {showSignupLinks ? (
        <div className="auth-form__signup-hint mt-6 border-t border-border/60 pt-4 text-center text-sm text-muted-foreground">
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </div>
      ) : null}
    </Tabs>
  );
}
