import { Link } from "react-router-dom";
import { AlertCircle, Info, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuthErrorUI } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";

type AuthStatusAlertProps = {
  error: AuthErrorUI;
  email?: string;
  onResendVerification?: () => void;
  onEnterVerificationCode?: () => void;
  resending?: boolean;
  className?: string;
};

const variantStyles = {
  warning: "border-amber-500/40 bg-amber-500/10",
  destructive: "border-destructive/40 bg-destructive/10",
  info: "border-primary/30 bg-primary/5",
};

const variantIcons = {
  warning: AlertCircle,
  destructive: XCircle,
  info: Info,
};

const variantIconClass = {
  warning: "text-amber-600 dark:text-amber-500",
  destructive: "text-destructive",
  info: "text-primary",
};

export function AuthStatusAlert({
  error,
  email,
  onResendVerification,
  onEnterVerificationCode,
  resending,
  className,
}: AuthStatusAlertProps) {
  const Icon = variantIcons[error.variant];
  const verifyHref = email
    ? `/verify-email?email=${encodeURIComponent(email)}`
    : "/verify-email";

  return (
    <div
      className={cn("rounded-xl border p-4 text-sm", variantStyles[error.variant], className)}
      role="alert"
      aria-live="polite"
    >
      <p className="flex items-start gap-2 font-semibold text-foreground">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", variantIconClass[error.variant])} />
        {error.title}
      </p>
      <p className="mt-1.5 text-muted-foreground">{error.description}</p>

      {email && error.showResendVerification && (
        <p className="mt-2 text-xs text-muted-foreground">
          Verification emails are sent to{" "}
          <strong className="text-foreground">{email}</strong>
        </p>
      )}

      {error.hints && error.hints.length > 0 && (
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-muted-foreground">
          {error.hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {error.showEnterVerificationCode && (
          onEnterVerificationCode ? (
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              onClick={onEnterVerificationCode}
            >
              Enter email OTP
            </Button>
          ) : (
            <Button type="button" size="sm" className="w-full sm:w-auto" asChild>
              <Link to={verifyHref}>Enter email OTP</Link>
            </Button>
          )
        )}
        {error.showResendVerification && onResendVerification && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={resending}
            onClick={onResendVerification}
          >
            {resending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Resend verification email"
            )}
          </Button>
        )}
        {error.showForgotPassword && (
          <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" asChild>
            <Link to="/forgot-password">Forgot password</Link>
          </Button>
        )}
        {error.showSignupLink && (
          <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" asChild>
            <Link to="/signup">Create account</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
