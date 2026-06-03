import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { updateAuthPassword } from "@/services/auth.service";
import { logAuthActivity } from "@/services/auth-telemetry.service";
import toast from "react-hot-toast";

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string().min(8, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords must match", path: ["confirm"] });

type Form = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema), mode: "onBlur" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setLinkInvalid(true);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (values: Form) => {
    setFormError(null);
    setSubmitting(true);
    const { error } = await updateAuthPassword(values.password);
    setSubmitting(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    await logAuthActivity("password_updated", {}).catch(() => {});
    toast.success("Password updated — sign in with your new password.");
    navigate("/login", { replace: true });
  };

  if (!ready) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Securing your session…</p>
      </div>
    );
  }

  return (
    <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="space-y-1 pb-2 text-center sm:text-left">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 sm:mx-0">
            <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Set a new password</CardTitle>
          <CardDescription className="text-pretty">
            Choose a strong password you haven&apos;t used elsewhere.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linkInvalid ? (
            <div className="space-y-4">
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                This reset link is invalid or has expired. Request a new one from the login page.
              </p>
              <Button variant="outline" className="w-full rounded-xl" asChild>
                <Link to="/forgot-password">Request new link</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              {formError ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              ) : null}
              <div>
                <Label htmlFor="npw">New password</Label>
                <Input
                  id="npw"
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 rounded-xl"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="npw2">Confirm password</Label>
                <Input
                  id="npw2"
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 rounded-xl"
                  {...register("confirm")}
                />
                {errors.confirm && (
                  <p className="mt-1 text-xs text-destructive" role="alert">
                    {errors.confirm.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Update password
                  </>
                )}
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
  );
}
