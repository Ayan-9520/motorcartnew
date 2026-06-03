import { Link, useLocation } from "react-router-dom";
import { Car } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AuthMinimalHeader() {
  const { pathname } = useLocation();
  const onLogin = pathname === "/login" || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password");
  const onSignup =
    pathname === "/signup" || pathname.startsWith("/signup/") || pathname === "/auth/callback";

  return (
    <header className="auth-header shrink-0 border-b border-border/60 bg-card/80 backdrop-blur-xl">
      <div className="container flex h-12 items-center justify-between gap-4">
        <Link to="/" className="auth-header__brand inline-flex items-center gap-2.5 no-underline">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
            <Car className="h-5 w-5" />
          </span>
          <span className="text-base font-bold tracking-tight text-foreground">
            {SITE_NAME}
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {!onLogin ? (
            <Link
              to="/login"
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              )}
            >
              Sign in
            </Link>
          ) : null}
          {!onSignup ? (
            <Link
              to="/signup"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90"
            >
              Create account
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
