import { cn } from "@/lib/utils";

export const MOTORCART_LOGO_FULL = "/brand/motorcart-logo.png";
export const MOTORCART_LOGO_FULL_DARK = "/brand/motorcart-logo-dark.png";
export const MOTORCART_LOGO_ICON = "/brand/motorcart-icon.png";

type MotorcartLogoProps = {
  /** Full = icon + wordmark. Icon = circular car emblem only. */
  variant?: "full" | "icon";
  className?: string;
  /** Intrinsic height hint; width scales with aspect ratio. */
  height?: number;
  alt?: string;
  /**
   * auto = official navy lockup everywhere; dark mode adds a white plate for contrast.
   * light = official navy lockup only (no plate).
   * dark = white wordmark variant (legacy panels only).
   */
  tone?: "dark" | "light" | "auto";
};

const DEFAULT_HEIGHT = { full: 36, icon: 36 } as const;
const FULL_ASPECT = 393 / 113;

function FullLogoImg({
  src,
  alt,
  h,
  className,
}: {
  src: string;
  alt: string;
  h: number;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={Math.round(h * FULL_ASPECT)}
      height={h}
      decoding="async"
      className={cn("mc-logo inline-block object-contain object-left", className)}
      style={{ height: h, width: "auto" }}
    />
  );
}

export function MotorcartLogo({
  variant = "full",
  className,
  height,
  alt = "Motorcart",
  tone = "auto",
}: MotorcartLogoProps) {
  const h = height ?? DEFAULT_HEIGHT[variant];

  if (variant === "icon") {
    return (
      <img
        src={MOTORCART_LOGO_ICON}
        alt={alt}
        width={h}
        height={h}
        decoding="async"
        className={cn("mc-logo mc-logo--icon inline-block object-contain", className)}
        style={{ height: h, width: h }}
      />
    );
  }

  const src = tone === "dark" ? MOTORCART_LOGO_FULL_DARK : MOTORCART_LOGO_FULL;

  if (tone === "auto") {
    return (
      <span className={cn("mc-logo-plate inline-flex items-center", className)}>
        <FullLogoImg src={MOTORCART_LOGO_FULL} alt={alt} h={h} />
      </span>
    );
  }

  return <FullLogoImg src={src} alt={alt} h={h} className={className} />;
}
