import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type AuthFormFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

/** Label on top; icon in its own box beside the input (not inside the field). */
export function AuthFormField({
  id,
  label,
  error,
  hint,
  icon,
  className,
  ...inputProps
}: AuthFormFieldProps) {
  return (
    <div className="auth-field">
      <Label htmlFor={id} className="auth-field__label">
        {label}
      </Label>
      <div className="auth-field__row">
        {icon ? (
          <span className="auth-field__icon-box" aria-hidden>
            {icon}
          </span>
        ) : null}
        <div className={cn("auth-field__input-wrap", !icon && "auth-field__input-wrap--full")}>
          <Input
            id={id}
            className={cn(
              "auth-field__input-alone h-10 rounded-lg border-input/80 bg-background",
              error && "border-destructive/60 focus-visible:ring-destructive/20",
              className
            )}
            {...inputProps}
          />
        </div>
      </div>
      {error ? <p className="auth-field__error">{error}</p> : hint ? <p className="auth-field__hint">{hint}</p> : null}
    </div>
  );
}
