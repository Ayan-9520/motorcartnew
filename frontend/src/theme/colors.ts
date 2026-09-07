/** Motorcart design tokens — single source of truth (hex) */

export const palette = {
  green: "#25D366",
  greenHover: "#1ebe5d",
  danger: "#ef4444",
  warning: "#f59e0b",
} as const;

export const lightColors = {
  background: "#f0f2f5",
  backgroundSecondary: "#ffffff",
  card: "#ffffff",
  navbar: "#ffffff",
  sidebar: "#ffffff",
  border: "#e5e7eb",
  foreground: "#111827",
  foregroundSecondary: "#6b7280",
  foregroundMuted: "#9ca3af",
  primary: palette.green,
  primaryHover: palette.greenHover,
  primaryForeground: "#ffffff",
  input: "#ffffff",
  accent: "#f3f4f6",
  destructive: palette.danger,
} as const;

export const darkColors = {
  background: "#000000",
  backgroundSecondary: "#0a0a0a",
  card: "#171717",
  navbar: "#0a0a0a",
  sidebar: "#0a0a0a",
  border: "#2e2e2e",
  foreground: "#ffffff",
  foregroundSecondary: "#a3a3a3",
  foregroundMuted: "#737373",
  primary: palette.green,
  primaryHover: palette.greenHover,
  primaryForeground: "#ffffff",
  input: "#0a0a0a",
  accent: "#171717",
  destructive: palette.danger,
} as const;

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
