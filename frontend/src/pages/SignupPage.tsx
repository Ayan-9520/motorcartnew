import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AuthPageChrome } from "@/components/auth/AuthPageChrome";
import { AuthPathCards } from "@/components/auth/AuthPathCards";
import { AuthPageLinks } from "@/components/auth/AuthPageLinks";
import { AuthRoleSwitch } from "@/components/auth/AuthRoleSwitch";
import { setPrivatePageMeta } from "@/utils/seo";

export function SignupPage() {
  useEffect(() => {
    setPrivatePageMeta("Create account");
  }, []);

  return (
    <AuthPageChrome
      variant="compact"
      className="auth-page--hub"
      eyebrow="Get started"
      title="Create your account"
      description="Choose Customer or Business — each has its own secure flow."
      footer={<AuthPageLinks prompt="Already registered?" linkLabel="Sign in" linkTo="/login" />}
    >
      <AuthRoleSwitch mode="signup" />
      <AuthPathCards />
      <p className="auth-page__legal">
        By continuing you agree to our{" "}
        <Link to="/terms" className="text-primary hover:underline">
          Terms
        </Link>{" "}
        &{" "}
        <Link to="/privacy" className="text-primary hover:underline">
          Privacy
        </Link>
      </p>
    </AuthPageChrome>
  );
}
