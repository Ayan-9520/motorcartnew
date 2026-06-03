import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ResolvedTheme, ThemeMode } from "./colors";

const STORAGE_KEY = "motorcart-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") return getSystemTheme();
  return mode;
}

const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: "#f0f2f5",
  dark: "#0b141a",
};

export function applyThemeToDocument(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[resolved]);
}

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  hydrate: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "system",
      resolved: "light",

      setMode: (mode) => {
        const resolved = resolveTheme(mode);
        applyThemeToDocument(resolved);
        set({ mode, resolved });
      },

      toggle: () => {
        const next = get().resolved === "dark" ? "light" : "dark";
        get().setMode(next);
      },

      hydrate: () => {
        const mode = get().mode;
        const resolved = resolveTheme(mode);
        applyThemeToDocument(resolved);
        set({ resolved });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({ mode: s.mode }),
      onRehydrateStorage: () => (state) => {
        state?.hydrate();
      },
    }
  )
);

/** Run before React paint to avoid flash */
export function initTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { state?: { mode?: ThemeMode } }) : null;
    const mode = parsed?.state?.mode ?? "system";
    applyThemeToDocument(resolveTheme(mode));
  } catch {
    applyThemeToDocument("light");
  }
}
