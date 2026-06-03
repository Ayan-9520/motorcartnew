import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageChrome } from "@/components/auth/AuthPageChrome";
import { AuthPageLinks } from "@/components/auth/AuthPageLinks";
import { AuthRoleSwitch } from "@/components/auth/AuthRoleSwitch";
import { getWorkspaceHomePath } from "@/auth/workspace-redirect";
import { useAuthStore } from "@/store/authStore";
import { setPrivatePageMeta } from "@/utils/seo";

export function LoginPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const profileHydrated = useAuthStore((s) => s.profileHydrated);

  useEffect(() => {
    setPrivatePageMeta("Sign in");
  }, []);

  useEffect(() => {
    if (isAuthenticated && profileHydrated && user) {
      navigate(getWorkspaceHomePath(user), { replace: true });
    }
  }, [isAuthenticated, profileHydrated, user, navigate]);

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
