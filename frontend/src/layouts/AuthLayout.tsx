import { useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Car, ShieldCheck, Sparkles, TrendingUp, Zap } from "lucide-react";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { AuthMinimalHeader } from "@/components/auth/AuthMinimalHeader";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

const TRUST_POINTS = [
  { icon: ShieldCheck, text: "Bank-grade KYC" },
  { icon: Zap, text: "Live in 24–48 hrs" },
  { icon: TrendingUp, text: "CRM & finance OS" },
];

export function AuthLayout() {
  const { pathname } = useLocation();
  const setLoginModalOpen = useUIStore((s) => s.setLoginModalOpen);
  const wideForm = pathname === "/signup/business";
  const scrollForm = pathname === "/signup/business";

  useEffect(() => {
    setLoginModalOpen(false);
  }, [setLoginModalOpen]);

  return (
    <div className="auth-layout flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background">
      <AuthMinimalHeader />
      <div className="auth-layout__shell relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="auth-layout__bg pointer-events-none absolute inset-0" aria-hidden />

        <aside className="auth-layout__brand relative hidden min-h-0 lg:flex lg:w-1/2 xl:w-[48%]">
          <div className="auth-layout__brand-glow pointer-events-none" aria-hidden />
          <div className="auth-layout__brand-center">
          <div className="auth-layout__brand-inner">
            <div className="auth-layout__brand-main">
              <Link to="/" className="auth-layout__logo">
                <span className="auth-layout__logo-mark">
                  <Car className="h-5 w-5" />
                </span>
                <span className="text-lg font-bold tracking-tight">{SITE_NAME}</span>
              </Link>

              <div className="auth-layout__hero">
                <p className="auth-layout__pill">
                  <Sparkles className="h-3 w-3" />
                  Secure onboarding
                </p>
                <h2 className="auth-layout__headline">{SITE_TAGLINE}</h2>
                <p className="auth-layout__tagline">
                  India&apos;s dealers, DSAs, parts & service partners — one ecosystem.
                </p>
              </div>

              <ul className="auth-layout__trust">
                {TRUST_POINTS.map(({ icon: Icon, text }) => (
                  <li key={text} className="auth-layout__trust-item">
                    <span className="auth-layout__trust-icon">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="auth-layout__stats grid grid-cols-3 gap-2.5">
              {[
                { value: "12K+", label: "Listings" },
                { value: "2.4K+", label: "Dealers" },
                { value: "₹800Cr+", label: "GMV" },
              ].map((s) => (
                <div key={s.label} className="auth-layout__stat">
                  <p className="text-sm font-bold text-foreground">{s.value}</p>
                  <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          </div>
        </aside>

        <div
          className={cn(
            "auth-layout__form relative flex min-h-0 flex-1 lg:w-1/2 xl:w-[52%]",
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
  );
}
