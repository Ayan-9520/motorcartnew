import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPageChrome } from "@/components/auth/AuthPageChrome";
import { AuthFormField } from "@/components/auth/AuthFormField";
import { AuthPageLinks } from "@/components/auth/AuthPageLinks";
import { AuthRoleSwitch } from "@/components/auth/AuthRoleSwitch";
import { useAuth } from "@/hooks/useAuth";
import { AuthStatusAlert } from "@/components/auth/AuthStatusAlert";
import { fetchUserProfile, normalizeAuthEmail } from "@/services/auth.service";
import { mapDbUserToAppUser } from "@/services/mapUser";
import type { AuthErrorUI } from "@/lib/auth-errors";
import type { AppRole } from "@/types/database";
import { useAuthStore } from "@/store/authStore";
import { PENDING_APPROVAL_PATH } from "@/auth/ecosystem-roles";
import { resolveLoginRedirect, waitForHydratedUser } from "@/auth/login-redirect";
import { resolveBusinessSignupRole } from "@/auth/resolve-business-signup-role";
import { enrichUserWithDealerContext } from "@/auth/enrich-user-dealer";
import {
  DEFAULT_SIGNUP_ROLE,
  SIGNUP_ROLE_OPTIONS,
  SIGNUP_ROLE_VALUES,
} from "@/auth/signup-roles";
import type { BusinessCategory } from "@/auth/business-signup-types";
import { persistBusinessSignupProfile } from "@/services/business-signup.service";
import { setPrivatePageMeta } from "@/utils/seo";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const signupRoleEnum = z.enum(SIGNUP_ROLE_VALUES as [AppRole, ...AppRole[]]);

const schema = z.object({
  ownerName: z.string().min(2, "Owner name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  mobile: z.string().refine((v) => v.replace(/\D/g, "").length >= 10, "Enter a valid 10-digit mobile"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: signupRoleEnum,
  companyName: z.string().min(2, "Company name is required"),
  gst: z
    .string()
    .min(15, "Enter a valid 15-character GSTIN")
    .max(15, "GSTIN must be 15 characters")
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i, "Invalid GSTIN format"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "Select state"),
  businessType: z.string().min(2, "Business type is required"),
  businessCategory: z.enum([
    "multi_brand",
    "single_brand",
    "preowned_lot",
    "new_car_showroom",
    "parts_wholesale",
    "service_garage",
    "dsa_finance",
    "other",
  ] as [BusinessCategory, ...BusinessCategory[]]),
});

type FormData = z.infer<typeof schema>;

export function BusinessSignupPage() {
  const navigate = useNavigate();
  const { register: registerUser, resendEmailConfirmation } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [signupError, setSignupError] = useState<AuthErrorUI | null>(null);
  const [docNames, setDocNames] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: DEFAULT_SIGNUP_ROLE, businessCategory: "multi_brand" },
    mode: "onBlur",
  });

  useEffect(() => {
    setPrivatePageMeta("Business registration");
  }, []);

  const onDocsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const names = Array.from(e.target.files ?? []).map((f) => f.name);
    setDocNames(names);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setSignupError(null);
    try {
      const email = normalizeAuthEmail(data.email);
      const businessMeta = {
        gst: data.gst.toUpperCase(),
        business_category: data.businessCategory,
        business_type: data.businessType,
        documents: docNames,
      };

      const signupRole = resolveBusinessSignupRole(data.role as AppRole, data.businessCategory);

      const { error, needsEmailConfirmation, data: authData, errorUI } = await registerUser({
        email,
        password: data.password,
        fullName: data.ownerName.trim(),
        phone: data.mobile.replace(/\D/g, ""),
        role: signupRole,
        businessSignup: true,
        companyName: data.companyName.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        businessMeta,
      });

      if (error) {
        if (errorUI) setSignupError(errorUI);
        return;
      }

      const sessionUser = authData?.session?.user;
      if (sessionUser) {
        await persistBusinessSignupProfile(sessionUser.id, {
          role: signupRole,
          ownerName: data.ownerName,
          email,
          password: data.password,
          mobile: data.mobile,
          companyName: data.companyName,
          gst: data.gst,
          city: data.city,
          state: data.state,
          businessCategory: data.businessCategory,
          businessType: data.businessType,
          documentNames: docNames,
        });
        const row = await fetchUserProfile(sessionUser.id);
        if (row) {
          const enriched = await enrichUserWithDealerContext(mapDbUserToAppUser(row));
          useAuthStore.getState().setUser(enriched);
          useAuthStore.getState().setProfileHydrated(true);
        }
      }

      if (authData?.session) {
        const hydrated = (await waitForHydratedUser()) ?? useAuthStore.getState().user;
        const dest = hydrated ? resolveLoginRedirect(hydrated, {}) : PENDING_APPROVAL_PATH;
        navigate(dest, { replace: true });
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
        eyebrow="Application received"
        title="Verify your business email"
        description={
          <>
            We sent a link to <strong className="text-foreground">{verifyEmail}</strong>. After verification, sign
            in — your application enters the admin approval queue (typically 24–48 business hours).
          </>
        }
      >
        <div className="flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </span>
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
      eyebrow="Business · KYC"
      title="Business registration"
      description="GST verification & admin approval before CRM access."
      className="auth-page--wide"
      footer={<AuthPageLinks prompt="Already registered?" linkLabel="Sign in" linkTo="/login" />}
    >
      <AuthRoleSwitch mode="signup" />
        {signupError && <AuthStatusAlert error={signupError} className="mb-3" />}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="auth-field">
            <Label htmlFor="biz-role" className="auth-field__label">
              Partner role
            </Label>
            <select
              id="biz-role"
              disabled={loading}
              {...register("role")}
              className="auth-select mt-1.5"
            >
              {SIGNUP_ROLE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <AuthFormField
            id="biz-owner"
            label="Owner / authorized signatory"
            disabled={loading}
            error={errors.ownerName?.message}
            {...register("ownerName")}
          />
          <AuthFormField
            id="biz-company"
            label="Company / showroom name"
            disabled={loading}
            error={errors.companyName?.message}
            {...register("companyName")}
          />
          <AuthFormField
            id="biz-gst"
            label="GSTIN"
            placeholder="22AAAAA0000A1Z5"
            className="uppercase"
            disabled={loading}
            error={errors.gst?.message}
            {...register("gst")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthFormField
              id="biz-city"
              label="City"
              disabled={loading}
              error={errors.city?.message}
              {...register("city")}
            />
            <div className="auth-field">
              <Label htmlFor="biz-state" className="auth-field__label">
                State
              </Label>
              <select
                id="biz-state"
                disabled={loading}
                {...register("state")}
                className="auth-select mt-1.5"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.state && <p className="mt-1 text-xs text-destructive">{errors.state.message}</p>}
            </div>
          </div>
          <div className="auth-field">
            <Label htmlFor="biz-category" className="auth-field__label">
              Business category
            </Label>
            <select
              id="biz-category"
              disabled={loading}
              {...register("businessCategory")}
              className="auth-select mt-1.5"
            >
              <option value="multi_brand">Multi-brand dealership</option>
              <option value="single_brand">Single-brand franchise</option>
              <option value="preowned_lot">Pre-owned lot</option>
              <option value="new_car_showroom">New car showroom</option>
              <option value="parts_wholesale">Parts wholesale</option>
              <option value="service_garage">Service garage</option>
              <option value="dsa_finance">DSA / finance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <AuthFormField
            id="biz-type"
            label="Business description"
            placeholder="e.g. Authorized Maruti dealer"
            disabled={loading}
            error={errors.businessType?.message}
            {...register("businessType")}
          />
          <AuthFormField
            id="biz-email"
            label="Work email"
            type="email"
            autoComplete="email"
            disabled={loading}
            error={errors.email?.message}
            {...register("email")}
          />
          <AuthFormField
            id="biz-mobile"
            label="Mobile"
            placeholder="9876543210"
            inputMode="tel"
            disabled={loading}
            error={errors.mobile?.message}
            {...register("mobile")}
          />
          <AuthFormField
            id="biz-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            disabled={loading}
            error={errors.password?.message}
            {...register("password")}
          />
          <div>
            <Label htmlFor="biz-docs">Upload documents (GST, PAN, trade license)</Label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-3">
              <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                id="biz-docs"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="border-0 bg-transparent p-0 file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground"
                disabled={loading}
                onChange={onDocsChange}
              />
            </div>
            {docNames.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">{docNames.join(", ")} — upload to storage after approval.</p>
            )}
          </div>
          <Button type="submit" className="auth-cta w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting application…
              </>
            ) : (
              "Submit business application"
            )}
          </Button>
        </form>
    </AuthPageChrome>
  );
}
