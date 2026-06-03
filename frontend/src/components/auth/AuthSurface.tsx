import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Premium glass auth card — depth, border glow, no harsh gradients. */
export function AuthSurface({
  children,
  className,
  compact = false,
}: {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "auth-surface relative overflow-hidden rounded-2xl border border-border/60",
        "bg-card shadow-[0_24px_48px_-24px_rgba(0,0,0,0.35),0_0_0_1px_hsl(var(--primary)/0.05)]",
        "backdrop-blur-xl",
        compact && "auth-surface--compact",
        className
      )}
    >
      <div className="auth-surface__accent pointer-events-none absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden />
      <div
        className={cn("relative", compact ? "auth-surface__inner--compact" : "px-5 py-6 sm:px-6 sm:py-7")}
      >
        {children}
      </div>
    </div>
  );
}
