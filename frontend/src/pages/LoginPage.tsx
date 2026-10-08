import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageChrome } from "@/components/auth/AuthPageChrome";
import { AuthPageLinks } from "@/components/auth/AuthPageLinks";
import { AuthRoleSwitch } from "@/components/auth/AuthRoleSwitch";
import { resolveLoginRedirect } from "@/auth/login-redirect";
import { useAuthStore } from "@/store/authStore";
import { setPrivatePageMeta } from "@/utils/seo";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const profileHydrated = useAuthStore((s) => s.profileHydrated);

  useEffect(() => {
    setPrivatePageMeta("Sign in");
  }, []);

  useEffect(() => {
    if (isAuthenticated && profileHydrated && user) {
      const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from ?? null;
      navigate(resolveLoginRedirect(user, { from, redirectParam: params.get("redirect") }), { replace: true });
    }
  }, [isAuthenticated, profileHydrated, user, navigate, location.state, params]);

  return (
    <AuthPageChrome
      variant="compact"
      eyebrow="Welcome back"
      title="Sign in"
      description="Email or phone OTP — then your role dashboard opens automatically."
      footer={<AuthPageLinks prompt="New here?" linkLabel="Create account" linkTo="/signup" />}
    >
      <AuthRoleSwitch mode="login" />
      <AuthForm showSignupLinks={false} compact />
    </AuthPageChrome>
  );
}
