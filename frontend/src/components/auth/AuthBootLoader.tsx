import { MotorcartLogo } from "@/components/brand/MotorcartLogo";

/** Full-screen boot state while session hydrates. */
export function AuthBootLoader() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <div className="relative flex flex-col items-center gap-4">
        <MotorcartLogo variant="icon" height={56} />
        <div className="text-center">
          <p className="mt-2 text-sm text-muted-foreground">Securing your session…</p>
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
