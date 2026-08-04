import { Link, useLocation } from "react-router-dom";
import { MotorcartLogo } from "@/components/brand/MotorcartLogo";
import { cn } from "@/lib/utils";

export function AuthMinimalHeader() {
  const { pathname } = useLocation();
  const onLogin = pathname === "/login" || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password");
  const onSignup =
    pathname === "/signup" || pathname.startsWith("/signup/") || pathname === "/auth/callback";

  return (
    <header className="auth-header shrink-0 border-b border-border/60 bg-card/80 backdrop-blur-xl">
      <div className="container flex h-12 items-center justify-between gap-3 sm:h-14">
        <Link to="/" className="auth-header__brand inline-flex items-center no-underline" aria-label="Motorcart home">
          <MotorcartLogo variant="full" height={34} className="hidden sm:block" />
          <MotorcartLogo variant="full" height={28} className="sm:hidden" />
        </Link>

        <nav className="flex shrink-0 items-center gap-2 sm:gap-3">
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
