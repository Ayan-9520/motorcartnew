import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { AuthPageChrome } from "@/components/auth/AuthPageChrome";
import { AuthFormField } from "@/components/auth/AuthFormField";
import { AuthPageLinks } from "@/components/auth/AuthPageLinks";
import { normalizeAuthEmail } from "@/services/auth.service";
import { setPrivatePageMeta } from "@/utils/seo";

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    setPrivatePageMeta("Reset password");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    const normalized = normalizeAuthEmail(email);
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setFieldError("Enter a valid email address");
      return;
    }
    setLoading(true);
    const { error } = await forgotPassword(normalized);
    setLoading(false);
    if (!error) setSent(true);
  };

  if (sent) {
    return (
      <AuthPageChrome
        eyebrow="Check your inbox"
        title="Reset link sent"
        description="If an account exists for that email, you'll receive a secure password reset link shortly."
        footer={<AuthPageLinks prompt="Remembered your password?" linkLabel="Sign in" linkTo="/login" />}
      >
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Links expire for your security. Check spam folders before requesting again.
        </div>
        <Button type="button" className="auth-cta mt-4 w-full" asChild>
          <Link to="/login">Back to sign in</Link>
        </Button>
      </AuthPageChrome>
    );
  }

  return (
    <AuthPageChrome
      eyebrow="Account recovery"
      title="Reset your password"
      description="We'll email you a secure link to choose a new password."
      footer={<AuthPageLinks prompt="Back to" linkLabel="Sign in" linkTo="/login" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthFormField
          id="forgot-email"
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          icon={<Mail className="h-4 w-4" />}
          error={fieldError ?? undefined}
        />
        <Button type="submit" className="auth-cta w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>
    </AuthPageChrome>
  );
}
