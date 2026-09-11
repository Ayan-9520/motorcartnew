/** Motorcart app theme — mirrors website light/dark tokens (WhatsApp-fintech green). */

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
  radius: number;
  radiusSm: number;
  radiusXs: number;
  radiusLg: number;
  maxContent: number;
  shadow: ShadowStyle;
  shadowSm: ShadowStyle;
  shadowLg: ShadowStyle;
};

const shared = {
  primary: "#25D366",
  primaryHover: "#1ebe5d",
  primaryOn: "#04120a",
  accent: "#3b82f6",
  danger: "#ef4444",
  warning: "#f59e0b",
  success: "#25D366",
  plate: "#ffffff",
  radius: 20,
  radiusSm: 14,
  radiusXs: 10,
  radiusLg: 24,
  maxContent: 1280,
} as const;

/** Light — matches website :root (#f0f2f5 surface, white cards, brand green) */
export const lightColors: ThemeColors = {
  ...shared,
  bg: "#eef1f6",
  bgElevated: "#ffffff",
  card: "#ffffff",
  cardHover: "#f8fafc",
  panel: "#ffffff",
  text: "#0f172a",
  textSecondary: "#334155",
  muted: "#64748b",
  border: "rgba(15, 23, 42, 0.06)",
  borderStrong: "#e2e8f0",
  primarySoft: "rgba(37, 211, 102, 0.1)",
  primaryGlow: "rgba(37, 211, 102, 0.22)",
  navy: "#0f172a",
  navyDeep: "#020617",
  header: "#ffffff",
  tabBar: "#ffffff",
  shadow: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  shadowSm: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  shadowLg: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
};

/** Dark — matches website .dark (#0b141a / elevated surfaces) */
export const darkColors: ThemeColors = {
  ...shared,
  bg: "#0b141a",
  bgElevated: "#111b21",
  card: "#1a242d",
  cardHover: "#202c33",
  panel: "#111b21",
  text: "#f4f7fb",
  textSecondary: "#d1d7db",
  muted: "#8696a0",
  border: "rgba(255, 255, 255, 0.06)",
  borderStrong: "#2a3942",
  primarySoft: "rgba(37, 211, 102, 0.12)",
  primaryGlow: "rgba(37, 211, 102, 0.28)",
  navy: "#111b21",
  navyDeep: "#0b141a",
  header: "#111b21",
  tabBar: "#111b21",
  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  shadowSm: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  shadowLg: {
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
};

export function colorsFor(resolved: ResolvedTheme): ThemeColors {
  return resolved === "dark" ? darkColors : lightColors;
}

/** @deprecated Prefer useCRM() — kept as light default for any stray static refs */
export const CRM = lightColors;

export const BRAND = {
  name: "Motorcart",
  green: shared.primary,
  navy: lightColors.navy,
  navyDeep: lightColors.navyDeep,
};

export const THEME_STORAGE_KEY = "motorcart-app-theme";
