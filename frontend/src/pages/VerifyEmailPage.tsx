import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPageChrome } from "@/components/auth/AuthPageChrome";
import { AuthPageLinks } from "@/components/auth/AuthPageLinks";
import { AuthStatusAlert } from "@/components/auth/AuthStatusAlert";
import { useAuth } from "@/hooks/useAuth";
import { normalizeAuthEmail } from "@/services/auth.service";
import { resolveLoginRedirect, waitForHydratedUser } from "@/auth/login-redirect";
import { useAuthStore } from "@/store/authStore";
import type { AuthErrorUI } from "@/lib/auth-errors";
import { setPrivatePageMeta } from "@/utils/seo";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { confirmSignupEmail, resendEmailConfirmation } = useAuth();
  const initialEmail = normalizeAuthEmail(params.get("email") ?? "");
  const initialCode = (params.get("code") ?? "").trim();

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errorUI, setErrorUI] = useState<AuthErrorUI | null>(null);

  const canSubmit = useMemo(
    () => Boolean(email.includes("@") && code.trim().length >= 4),
    [email, code],
  );

  useEffect(() => {
    setPrivatePageMeta("Verify email");
  }, []);

  useEffect(() => {
    if (!initialEmail || !initialCode || initialCode.length < 4) return;
    void (async () => {
      setBusy(true);
      setErrorUI(null);
      const result = await confirmSignupEmail(initialEmail, initialCode);
      setBusy(false);
      if (result.error) {
        setErrorUI(result.errorUI ?? null);
        return;
      }
      const u = (await waitForHydratedUser()) ?? useAuthStore.getState().user;
      if (u) navigate(resolveLoginRedirect(u, {}), { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot from URL
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErrorUI(null);
    if (!canSubmit) {
      setMsg("Enter your email and the 6-digit code from your inbox.");
      return;
    }
    setBusy(true);
    const result = await confirmSignupEmail(normalizeAuthEmail(email), code.trim());
    setBusy(false);
    if (result.error) {
      setErrorUI(result.errorUI ?? null);
      return;
    }
    const u = (await waitForHydratedUser()) ?? useAuthStore.getState().user;
    if (u) navigate(resolveLoginRedirect(u, {}), { replace: true });
  };

  const onResend = async () => {
    const normalized = normalizeAuthEmail(email);
    if (!normalized.includes("@")) {
      setMsg("Enter your email first");
      return;
    }
    setResending(true);
    setErrorUI(null);
    setMsg(null);
    const { error, errorUI: ui } = await resendEmailConfirmation(normalized);
    setResending(false);
    if (error) {
      setErrorUI(ui);
      setMsg(null);
      return;
    }
    setMsg("New code sent — check inbox and spam (valid 48 hours).");
  };

  return (
    <AuthPageChrome
      eyebrow="Almost there"
      title="Verify your email"
      description="Enter the 6-digit code we emailed you. Codes stay valid for 48 hours."
      footer={<AuthPageLinks prompt="Already verified?" linkLabel="Sign in" linkTo="/login" />}
    >
      {errorUI ? (
        <AuthStatusAlert
          error={errorUI}
          email={normalizeAuthEmail(email)}
          onResendVerification={() => void onResend()}
          resending={resending}
          className="mb-3"
        />
      ) : null}
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div>
          <Label htmlFor="verify-email">Email</Label>
          <div className="relative mt-1.5">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="verify-email"
              className="h-11 rounded-xl pl-9"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              autoComplete="email"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="verify-code">Verification code</Label>
          <Input
            id="verify-code"
            className="mt-1.5 h-11 rounded-xl tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            disabled={busy}
            placeholder="6-digit code"
          />
        </div>
        {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
        <Button type="submit" className="auth-cta w-full" disabled={busy || !canSubmit}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Verify & continue
        </Button>
        <Button type="button" variant="outline" className="w-full rounded-xl" disabled={resending || busy} onClick={() => void onResend()}>
          {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Resend code
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthPageChrome>
  );
}
