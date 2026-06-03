import { Car } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";

/** Full-screen boot state while Supabase session hydrates (startup-grade). */
export function AuthBootLoader() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <div className="relative flex flex-col items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-[0_12px_40px_-12px_rgba(22,163,74,0.55)]">
          <Car className="h-8 w-8 text-primary-foreground" aria-hidden />
        </span>
        <div className="text-center">
          <p className="text-lg font-semibold tracking-tight">{SITE_NAME}</p>
          <p className="mt-1 text-sm text-muted-foreground">Securing your session…</p>
        </div>
        <div className="flex gap-1.5 pt-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 animate-pulse rounded-full bg-primary/70"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
