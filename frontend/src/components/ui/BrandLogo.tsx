import { useState } from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  src: string;
  alt: string;
  className?: string;
  /** Marquee tiles use fixed height; cards use larger */
  size?: "sm" | "md" | "lg";
}

const sizeClass = {
  sm: "brand-logo brand-logo-sm",
  md: "brand-logo brand-logo-md",
  lg: "brand-logo brand-logo-lg",
};

export function BrandLogo({ src, alt, className, size = "md" }: BrandLogoProps) {
  const [failed, setFailed] = useState(false);
  const initials = alt
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (failed || !src) {
    return (
      <span
        className={cn(
          "partner-logo-fallback inline-flex items-center justify-center rounded-md bg-muted px-2 text-[10px] font-bold tracking-wide text-muted-foreground",
          sizeClass[size],
          className
        )}
        aria-label={alt}
        title={alt}
      >
        {initials || "—"}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(sizeClass[size], className)}
    />
  );
}
