import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthPageChromeProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  variant?: "default" | "compact";
};

/** Premium auth page header + body — use inside AuthSurface. */
export function AuthPageChrome({
  eyebrow,
  title,
  description,
  children,
  footer,
  className,
  variant = "default",
}: AuthPageChromeProps) {
  return (
    <div className={cn("auth-page", variant === "compact" && "auth-page--compact", className)}>
      <header className="auth-page__header">
        {eyebrow ? <p className="auth-page__eyebrow">{eyebrow}</p> : null}
        <h1 className="auth-page__title">{title}</h1>
        {description ? <p className="auth-page__desc">{description}</p> : null}
      </header>
      <div className="auth-page__body">{children}</div>
      {footer ? <footer className="auth-page__footer">{footer}</footer> : null}
    </div>
  );
}
