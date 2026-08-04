import { cn } from "@/lib/utils";
import { MotorcartLogo } from "./MotorcartLogo";

type MotorcartBrandPlateProps = {
  variant?: "full" | "icon";
  height?: number;
  className?: string;
  plateClassName?: string;
};

/** Navy lockup on white plate — readable on dark headers, auth, and footers. */
export function MotorcartBrandPlate({
  variant = "full",
  height,
  className,
  plateClassName,
}: MotorcartBrandPlateProps) {
  const h = height ?? (variant === "full" ? 34 : 32);
  return (
    <span className={cn("mc-logo-plate mc-logo-plate--always inline-flex items-center", plateClassName)}>
      <MotorcartLogo variant={variant} height={h} tone="light" className={className} />
    </span>
  );
}
