import { cn } from "@/lib/utils";

/** Cache-bust so theme lockups refresh after brand asset updates. */
const LOGO_ASSET_V = "20260908c";

export const MOTORCART_LOGO_FULL = `/brand/motorcart-logo.png?v=${LOGO_ASSET_V}`;
export const MOTORCART_LOGO_FULL_DARK = `/brand/motorcart-logo-dark.png?v=${LOGO_ASSET_V}`;
export const MOTORCART_LOGO_ICON = `/brand/motorcart-icon.png?v=${LOGO_ASSET_V}`;

type MotorcartLogoProps = {
  /** Full = icon + wordmark. Icon = circular car emblem only. */
  variant?: "full" | "icon";
  className?: string;
  /** Intrinsic height hint; width scales with aspect ratio. */
  height?: number;
  alt?: string;
  /**
   * auto = theme-aware lockup (navy wordmark in light, light wordmark in dark — no white plate).
   * light = official navy lockup only.
   * dark = light/white wordmark variant.
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
  decorative,
}: {
  src: string;
  alt: string;
  h: number;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <img
      src={src}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
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

  if (tone === "auto") {
    return (
      <span className={cn("mc-logo-swap inline-flex items-center", className)}>
        <FullLogoImg src={MOTORCART_LOGO_FULL} alt={alt} h={h} className="mc-logo--for-light" />
        <FullLogoImg
          src={MOTORCART_LOGO_FULL_DARK}
          alt={alt}
          h={h}
          className="mc-logo--for-dark"
          decorative
        />
      </span>
    );
  }

  const src = tone === "dark" ? MOTORCART_LOGO_FULL_DARK : MOTORCART_LOGO_FULL;
  return <FullLogoImg src={src} alt={alt} h={h} className={className} />;
}
