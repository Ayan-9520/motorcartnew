import { cn } from "@/lib/utils";
import { MotorcartLogo } from "./MotorcartLogo";

type MotorcartBrandPlateProps = {
  variant?: "full" | "icon";
  height?: number;
  className?: string;
  /** @deprecated White plate removed — theme-aware logo only. Kept for API compat. */
  plateClassName?: string;
};

/** Theme-aware Motortcart mark (no white plate — natural in light & dark). */
export function MotorcartBrandPlate({
  variant = "full",
  height,
  className,
  plateClassName: _plateClassName,
}: MotorcartBrandPlateProps) {
  const h = height ?? (variant === "full" ? 34 : 32);
  return (
    <span className={cn("inline-flex items-center", className)}>
      <MotorcartLogo variant={variant} height={h} tone="auto" />
    </span>
  );
}
