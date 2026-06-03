import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { AuthStatusAlert } from "@/components/auth/AuthStatusAlert";
import { AuthPageChrome } from "@/components/auth/AuthPageChrome";
import { AuthFormField } from "@/components/auth/AuthFormField";
import { AuthPageLinks } from "@/components/auth/AuthPageLinks";
import { AuthRoleSwitch } from "@/components/auth/AuthRoleSwitch";
import { normalizeAuthEmail } from "@/services/auth.service";
import type { AuthErrorUI } from "@/lib/auth-errors";
import { useAuthStore } from "@/store/authStore";
import { resolvePostLoginPath } from "@/auth/resolve-post-login";
import { setPrivatePageMeta } from "@/utils/seo";

const schema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || v.replace(/\D/g, "").length >= 10, "Enter a valid 10-digit phone"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export function CustomerSignupPage() {
  const navigate = useNavigate();
  const { register: registerUser, resendEmailConfirmation } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [signupError, setSignupError] = useState<AuthErrorUI | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), mode: "onBlur" });

  useEffect(() => {
    setPrivatePageMeta("Customer sign up");
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setSignupError(null);
    try {
      const email = normalizeAuthEmail(data.email);
      const { error, needsEmailConfirmation, data: authData, errorUI } = await registerUser({
        email,
        password: data.password,
        fullName: data.fullName.trim(),
        phone: data.phone?.replace(/\D/g, ""),
        role: "customer",
        businessSignup: false,
      });

      if (error) {
        if (errorUI) setSignupError(errorUI);
        return;
      }

      if (authData?.session) {
        const u = useAuthStore.getState().user;
        navigate(u ? resolvePostLoginPath(u.role, null, u) : "/dashboard/customer", { replace: true });
        return;
      }

      if (needsEmailConfirmation) {
        setVerifyEmail(email);
        return;
      }

      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  if (verifyEmail) {
    return (
      <AuthPageChrome
        eyebrow="Almost there"
        title="Verify your email"
        description={
          <>
            We sent a confirmation link to <strong className="text-foreground">{verifyEmail}</strong>. After
            verifying, sign in to open your personal dashboard.
          </>
        }
      >
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          Links expire in 24 hours. Check spam or resend below.
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-4 h-11 w-full rounded-xl"
          disabled={resending}
          onClick={async () => {
            setResending(true);
            await resendEmailConfirmation(verifyEmail);
            setResending(false);
          }}
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
        <Button type="button" className="auth-cta mt-2 w-full" asChild>
          <Link to="/login">Go to sign in</Link>
        </Button>
      </AuthPageChrome>
    );
  }

  return (
    <AuthPageChrome
      variant="compact"
      eyebrow="Personal account"
      title="Customer signup"
      description="Your ownership dashboard — garage, finance & services."
      footer={<AuthPageLinks prompt="Already have an account?" linkLabel="Sign in" linkTo="/login" />}
    >
      <AuthRoleSwitch mode="signup" />
      {signupError && <AuthStatusAlert error={signupError} className="mb-3" />}

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form__fields auth-form__fields--grid" noValidate>
        <AuthFormField
          id="cust-name"
          label="Full name"
          autoComplete="name"
          disabled={loading}
          icon={<User className="h-4 w-4" />}
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <AuthFormField
          id="cust-email"
          label="Email"
          type="email"
          autoComplete="email"
          disabled={loading}
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register("email")}
        />
        <AuthFormField
          id="cust-phone"
          label="Mobile"
          placeholder="9876543210"
          inputMode="tel"
          autoComplete="tel"
          disabled={loading}
          icon={<Phone className="h-4 w-4" />}
          error={errors.phone?.message}
          {...register("phone")}
        />
        <AuthFormField
          id="cust-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          disabled={loading}
          icon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" disabled={loading} className="auth-cta w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create customer account"
          )}
        </Button>
      </form>
    </AuthPageChrome>
  );
}
