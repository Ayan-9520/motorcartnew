/** Motorcart companion theme — same tokens as website `global.css` (:root / .dark). */

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export type ShadowStyle = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
};

export type ThemeColors = {
  bg: string;
  bgElevated: string;
  card: string;
  cardHover: string;
  panel: string;
  text: string;
  textSecondary: string;
  muted: string;
  border: string;
  borderStrong: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  primaryGlow: string;
  /** Text on primary buttons — website uses white */
  primaryOn: string;
  navy: string;
  navyDeep: string;
  header: string;
  tabBar: string;
  accent: string;
  danger: string;
  warning: string;
  success: string;
  plate: string;
  /** Inter — same as motorcart.in */
  fontFamily: string;
  radius: number;
  radiusSm: number;
  radiusXs: number;
  radiusLg: number;
  maxContent: number;
  shadow: ShadowStyle;
  shadowSm: ShadowStyle;
  shadowLg: ShadowStyle;
};

/** Website brand: --mc-green #25d366 · --primary-foreground white · Inter */
export const FONT_FAMILY =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const shared = {
  primary: "#25D366",
  primaryHover: "#1ebe5d",
  primaryOn: "#ffffff",
  accent: "#3b82f6",
  danger: "#ef4444",
  warning: "#f59e0b",
  success: "#25D366",
  plate: "#ffffff",
  fontFamily: FONT_FAMILY,
  radius: 20,
  radiusSm: 14,
  radiusXs: 10,
  radiusLg: 24,
  maxContent: 1280,
} as const;

/** Light — website :root / --mc-surface #f0f2f5 */
export const lightColors: ThemeColors = {
  ...shared,
  bg: "#f0f2f5",
  bgElevated: "#ffffff",
  card: "#ffffff",
  cardHover: "#f8fafc",
  panel: "#ffffff",
  text: "#0f172a",
  textSecondary: "#334155",
  muted: "#64748b",
  border: "#e5e7eb",
  borderStrong: "#e5e7eb",
  primarySoft: "rgba(37, 211, 102, 0.1)",
  primaryGlow: "rgba(37, 211, 102, 0.22)",
  navy: "#0f172a",
  navyDeep: "#020617",
  header: "#ffffff",
  tabBar: "#ffffff",
  shadow: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  shadowSm: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  shadowLg: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
};

/** Dark — website .dark pure black / charcoal cards */
export const darkColors: ThemeColors = {
  ...shared,
  bg: "#000000",
  bgElevated: "#171717",
  card: "#171717",
  cardHover: "#1f1f1f",
  panel: "#0a0a0a",
  text: "#ffffff",
  textSecondary: "#e5e5e5",
  muted: "#a3a3a3",
  border: "#2e2e2e",
  borderStrong: "#2e2e2e",
  primarySoft: "rgba(37, 211, 102, 0.12)",
  primaryGlow: "rgba(37, 211, 102, 0.28)",
  navy: "#171717",
  navyDeep: "#000000",
  header: "#0a0a0a",
  tabBar: "#0a0a0a",
  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  shadowSm: {
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  shadowLg: {
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
};

export function colorsFor(resolved: ResolvedTheme): ThemeColors {
  return resolved === "dark" ? darkColors : lightColors;
}

/** @deprecated Prefer useCRM() */
export const CRM = lightColors;

export const BRAND = {
  name: "Motorcart",
  green: shared.primary,
  navy: lightColors.navy,
  navyDeep: lightColors.navyDeep,
};

export const THEME_STORAGE_KEY = "motorcart-app-theme";
