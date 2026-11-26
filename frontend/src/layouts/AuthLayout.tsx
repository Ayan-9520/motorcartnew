import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { AuthMinimalHeader } from "@/components/auth/AuthMinimalHeader";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

export function AuthLayout() {
  const { pathname } = useLocation();
  const setLoginModalOpen = useUIStore((s) => s.setLoginModalOpen);
  const wideForm = pathname === "/signup/business";
  const scrollForm = pathname === "/signup/business";
  const signingIn = pathname.startsWith("/login");

  useEffect(() => {
    setLoginModalOpen(false);
  }, [setLoginModalOpen]);

  return (
    <div className="auth-layout flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background">
      <AuthMinimalHeader />
      <div className="auth-layout__shell relative flex min-h-0 flex-1 items-center justify-center px-4 py-6">
        <div className="auth-layout__bg pointer-events-none absolute inset-0" aria-hidden />
        <div className="auth-layout__stage relative z-[1] flex min-h-0 w-full max-w-[980px] flex-col overflow-hidden lg:min-h-[560px] lg:flex-row">

        <aside className="auth-layout__brand relative hidden min-h-0 lg:flex lg:w-[42%]">
          <div className="auth-layout__brand-center">
            <p className="auth-layout__mark">Motorcart</p>
            <h2 className="auth-layout__headline">
              {signingIn ? "Welcome back" : "Start from this page"}
            </h2>
            <p className="auth-layout__tagline">
              {signingIn
                ? "Your desk is ready. Continue from where you left the garage, showroom, or loan file."
                : "Create the account here. Motorcart reviews a business profile, then the login is activated."}
            </p>
          </div>
        </aside>

        <div
          className={cn(
            "auth-layout__form relative flex min-h-0 flex-1 lg:w-[56%]",
            scrollForm ? "overflow-y-auto" : "overflow-hidden"
          )}
        >
          <div
            className={cn(
              "auth-layout__form-center",
              wideForm ? "auth-layout__form-center--wide" : ""
            )}
          >
          <div
            className={cn(
              "auth-layout__form-wrap w-full",
              wideForm ? "max-w-[26rem]" : "max-w-[24rem] sm:max-w-[26rem]"
            )}
          >
            <AuthSurface compact>
              <Outlet />
            </AuthSurface>
          </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
