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
    sendEmailOtp,
    verifyEmailOtp,
    confirmSignupEmail,
    loginGoogle,
    resendEmailConfirmation,
    isLoading,
    isAuthenticated,
  } = useAuth();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [formattedPhone, setFormattedPhone] = useState("");
  const [emailOtpMode, setEmailOtpMode] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailForOtp, setEmailForOtp] = useState("");
  const [emailOtpCode, setEmailOtpCode] = useState("");
  /** First-time signup verification (48h code) — separate from passwordless Email OTP login. */
  const [signupVerifyMode, setSignupVerifyMode] = useState(false);
  const [signupVerifyCode, setSignupVerifyCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [loginError, setLoginError] = useState<AuthErrorUI | null>(null);
  const [attemptedEmail, setAttemptedEmail] = useState("");
  const [providers, setProviders] = useState<{
    phone: boolean;
    google: boolean;
    needsEmailConfirm: boolean;
    emailOtpEnabled: boolean;
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
          emailOtpEnabled: s.emailOtpEnabled ?? true,
        });
      })
      .finally(() => setSettingsLoading(false));
  }, []);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    mode: "onBlur",
  });

  const clearLoginError = () => setLoginError(null);

  const openSignupVerify = (email?: string) => {
    const resolved = normalizeAuthEmail(email || attemptedEmail || getValues("email") || "");
    if (resolved.includes("@")) setAttemptedEmail(resolved);
    setSignupVerifyMode(true);
    setEmailOtpMode(false);
    setSignupVerifyCode("");
    setLoginError(null);
  };

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
      if (
        result.errorCode === "email_not_verified" ||
        (result.errorCode === "sign_in_blocked" && providers?.needsEmailConfirm)
      ) {
        setSignupVerifyMode(true);
        setEmailOtpMode(false);
      }
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
      setSignupVerifyMode(true);
      setLoginError({
        code: "email_not_verified",
        title: "Verification email sent",
        description: "Enter the new 6-digit code below (valid 48 hours), then you can use password next time.",
        variant: "info",
        showResendVerification: true,
        showEnterVerificationCode: true,
      });
    }
  };

  const onConfirmSignupCode = async () => {
    const email = normalizeAuthEmail(attemptedEmail || getValues("email") || "");
    if (!email.includes("@")) {
      setLoginError({
        code: "unknown",
        title: "Email required",
        description: "Enter the same email you used at signup.",
        variant: "info",
      });
      return;
    }
    setSubmitting(true);
    setAttemptedEmail(email);
    const { error } = await confirmSignupEmail(email, signupVerifyCode.trim());
    setSubmitting(false);
    if (!error) {
      setSignupVerifyMode(false);
      onSuccess?.();
      await goToWorkspace();
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

  const onSendEmailOtp = async () => {
    const email = normalizeAuthEmail(emailForOtp || attemptedEmail);
    if (!email.includes("@")) {
      setLoginError({
        code: "unknown",
        title: "Email required",
        description: "Enter your email address to receive a login code.",
        variant: "info",
      });
      return;
    }
    setSubmitting(true);
    setAttemptedEmail(email);
    const { error } = await sendEmailOtp(email);
    setSubmitting(false);
    if (!error) {
      setEmailForOtp(email);
      setEmailOtpSent(true);
      setLoginError(null);
    }
  };

  const onVerifyEmailOtp = async () => {
    setSubmitting(true);
    const { error } = await verifyEmailOtp(normalizeAuthEmail(emailForOtp), emailOtpCode.trim());
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
            First sign-in needs the 6-digit code from your email (valid 48 hours). After that, use email + password.{" "}
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => openSignupVerify()}>
              Enter code here
            </button>
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
            onEnterVerificationCode={() => openSignupVerify()}
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

        {signupVerifyMode ? (
          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm font-medium text-foreground">Enter signup email OTP</p>
            <p className="text-xs text-muted-foreground">
              Use the 6-digit code from MotorCart (not the Password / Email OTP login toggle below). Sent to{" "}
              <strong className="text-foreground">{attemptedEmail || "your inbox"}</strong>.
            </p>
            <AuthFormField
              id="login-signup-email"
              label="Email address"
              type="email"
              autoComplete="email"
              disabled={busy}
              icon={<Mail className="h-4 w-4" />}
              value={attemptedEmail}
              onChange={(e) => setAttemptedEmail(normalizeAuthEmail(e.target.value))}
            />
            <div className="auth-field">
              <Label htmlFor="signup-verify-code" className="auth-field__label">
                6-digit code from email
              </Label>
              <Input
                id="signup-verify-code"
                className="mt-1.5 h-11 rounded-xl tracking-widest"
                value={signupVerifyCode}
                onChange={(e) => setSignupVerifyCode(e.target.value)}
                inputMode="numeric"
                disabled={busy}
                placeholder="e.g. 973911"
                autoFocus
              />
            </div>
            <Button
              type="button"
              className="auth-cta w-full"
              disabled={busy || signupVerifyCode.trim().length < 4}
              onClick={() => void onConfirmSignupCode()}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify OTP & continue
            </Button>
            <div className="flex flex-col gap-1 sm:flex-row">
              <Button type="button" variant="outline" className="w-full text-sm" disabled={busy || resending} onClick={() => void onResendVerification()}>
                {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Resend code
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                disabled={busy}
                onClick={() => {
                  setSignupVerifyMode(false);
                  setSignupVerifyCode("");
                }}
              >
                Back to password
              </Button>
            </div>
          </div>
        ) : null}

        {!signupVerifyMode && providers?.emailOtpEnabled !== false && (
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              className={cn(
                "rounded-lg px-2.5 py-1.5 font-medium",
                !emailOtpMode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                setEmailOtpMode(false);
                setEmailOtpSent(false);
              }}
            >
              Password
            </button>
            <button
              type="button"
              className={cn(
                "rounded-lg px-2.5 py-1.5 font-medium",
                emailOtpMode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setEmailOtpMode(true)}
            >
              Email OTP
            </button>
          </div>
        )}

        {!signupVerifyMode && emailOtpMode ? (
          <div className="space-y-3">
            {!emailOtpSent ? (
              <>
                <AuthFormField
                  id="login-email-otp"
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  disabled={busy}
                  icon={<Mail className="h-4 w-4" />}
                  value={emailForOtp}
                  onChange={(e) => setEmailForOtp(e.target.value)}
                />
                <Button type="button" className="auth-cta w-full" disabled={busy} onClick={onSendEmailOtp}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send login code
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Code sent to <strong className="text-foreground">{emailForOtp}</strong> (10 minutes)
                </p>
                <div className="auth-field">
                  <Label htmlFor="email-otp-code" className="auth-field__label">
                    Enter code
                  </Label>
                  <Input
                    id="email-otp-code"
                    className="mt-1.5 h-11 rounded-xl tracking-widest"
                    value={emailOtpCode}
                    onChange={(e) => setEmailOtpCode(e.target.value)}
                    inputMode="numeric"
                    disabled={busy}
                  />
                </div>
                <Button
                  type="button"
                  className="auth-cta w-full"
                  disabled={busy || emailOtpCode.trim().length < 4}
                  onClick={onVerifyEmailOtp}
                >
                  Verify & sign in
                </Button>
                <Button type="button" variant="ghost" className="w-full text-sm" disabled={busy} onClick={onSendEmailOtp}>
                  Resend code
                </Button>
              </>
            )}
          </div>
        ) : !signupVerifyMode ? (
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
        ) : null}

        <p className="text-center text-sm">
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Forgot password?
          </Link>
          {" · "}
          <button type="button" className="font-medium text-primary hover:underline" onClick={() => openSignupVerify()}>
            Verify email OTP
          </button>
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
