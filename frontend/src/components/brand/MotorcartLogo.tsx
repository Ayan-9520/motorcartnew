import { cn } from "@/lib/utils";

/** Cache-bust so theme lockups refresh after brand asset updates. */
const LOGO_ASSET_V = "20260930a";

export const MOTORCART_LOGO_FULL = `/brand/motorcart-lockup.png?v=${LOGO_ASSET_V}`;
export const MOTORCART_LOGO_FULL_DARK = `/brand/motorcart-lockup-dark.png?v=${LOGO_ASSET_V}`;
export const MOTORCART_LOGO_WORDMARK = `/brand/motorcart-wordmark.png?v=${LOGO_ASSET_V}`;
export const MOTORCART_LOGO_WORDMARK_DARK = `/brand/motorcart-wordmark-dark.png?v=${LOGO_ASSET_V}`;
export const MOTORCART_LOGO_ICON = `/brand/motorcart-emblem.png?v=${LOGO_ASSET_V}`;
export const MOTORCART_LOGO_ICON_DARK = `/brand/motorcart-emblem-dark.png?v=${LOGO_ASSET_V}`;

type MotorcartLogoProps = {
  /**
   * Full = icon + wordmark. Icon = circular car emblem only.
   * Wordmark = text only (header) — navy text in light theme, white text in dark theme.
   */
  variant?: "full" | "icon" | "wordmark";
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

const DEFAULT_HEIGHT = { full: 36, icon: 36, wordmark: 28 } as const;
const FULL_ASPECT = 994 / 262;
const WORDMARK_ASPECT = 812 / 152;
const ICON_ASPECT = 175 / 192;

function FullLogoImg({
  src,
  alt,
  h,
  className,
  decorative,
  aspect = FULL_ASPECT,
}: {
  src: string;
  alt: string;
  h: number;
  className?: string;
  decorative?: boolean;
  aspect?: number;
}) {
  return (
    <img
      src={src}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      width={Math.round(h * aspect)}
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

  if (variant === "wordmark") {
    if (tone === "auto") {
      return (
        <span className={cn("mc-logo-swap inline-flex items-center", className)}>
          <FullLogoImg src={MOTORCART_LOGO_WORDMARK} alt={alt} h={h} className="mc-logo--for-light" aspect={WORDMARK_ASPECT} />
          <FullLogoImg
            src={MOTORCART_LOGO_WORDMARK_DARK}
            alt={alt}
            h={h}
            className="mc-logo--for-dark"
            aspect={WORDMARK_ASPECT}
            decorative
          />
        </span>
      );
    }
    return (
      <FullLogoImg
        src={tone === "dark" ? MOTORCART_LOGO_WORDMARK_DARK : MOTORCART_LOGO_WORDMARK}
        alt={alt}
        h={h}
        className={className}
        aspect={WORDMARK_ASPECT}
      />
    );
  }

  if (variant === "icon") {
    const iconImg = (src: string, extra?: string, decorative?: boolean) => (
      <img
        src={src}
        alt={decorative ? "" : alt}
        aria-hidden={decorative || undefined}
        width={Math.round(h * ICON_ASPECT)}
        height={h}
        decoding="async"
        className={cn("mc-logo mc-logo--icon inline-block object-contain", extra)}
        style={{ height: h, width: "auto" }}
      />
    );
    if (tone === "auto") {
      return (
        <span className={cn("mc-logo-swap inline-flex items-center", className)}>
          {iconImg(MOTORCART_LOGO_ICON, "mc-logo--for-light")}
          {iconImg(MOTORCART_LOGO_ICON_DARK, "mc-logo--for-dark", true)}
        </span>
      );
    }
    return iconImg(tone === "dark" ? MOTORCART_LOGO_ICON_DARK : MOTORCART_LOGO_ICON, className);
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
