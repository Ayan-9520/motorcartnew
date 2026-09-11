import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, Platform, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  FONT_FAMILY,
  THEME_STORAGE_KEY,
  colorsFor,
  type ResolvedTheme,
  type ThemeColors,
  type ThemeMode,
} from "./theme";

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const INTER_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";

function ensureWebBrandAssets() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  if (!document.getElementById("mc-inter-font")) {
    const pre1 = document.createElement("link");
    pre1.rel = "preconnect";
    pre1.href = "https://fonts.googleapis.com";
    document.head.appendChild(pre1);
    const pre2 = document.createElement("link");
    pre2.rel = "preconnect";
    pre2.href = "https://fonts.gstatic.com";
    pre2.crossOrigin = "anonymous";
    document.head.appendChild(pre2);
    const link = document.createElement("link");
    link.id = "mc-inter-font";
    link.rel = "stylesheet";
    link.href = INTER_HREF;
    document.head.appendChild(link);
  }

  if (!document.getElementById("mc-brand-font-css")) {
    const style = document.createElement("style");
    style.id = "mc-brand-font-css";
    style.textContent = `
      html, body, #root, #root * {
        font-family: ${FONT_FAMILY} !important;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      body { margin: 0; }
      input, button, textarea, select {
        font-family: inherit !important;
      }
    `;
    document.head.appendChild(style);
  }
}

function applyWebDocument(resolved: ResolvedTheme) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  ensureWebBrandAssets();
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  // Match website --mc-surface
  root.style.backgroundColor = resolved === "dark" ? "#000000" : "#f0f2f5";
  if (document.body) {
    document.body.style.backgroundColor = resolved === "dark" ? "#000000" : "#f0f2f5";
    document.body.style.fontFamily = FONT_FAMILY;
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#000000" : "#f0f2f5");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureWebBrandAssets();
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (alive && (raw === "light" || raw === "dark" || raw === "system")) {
          setModeState(raw);
        }
      } catch {
        /* ignore */
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const resolved: ResolvedTheme = useMemo(() => {
    if (mode === "system") return system === "dark" ? "dark" : "light";
    return mode;
  }, [mode, system]);

  const colors = useMemo(() => colorsFor(resolved), [resolved]);

  useEffect(() => {
    if (!ready) return;
    applyWebDocument(resolved);
  }, [ready, resolved]);

  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      if (mode === "system") {
        const next = Appearance.getColorScheme() === "dark" ? "dark" : "light";
        applyWebDocument(next);
      }
    });
    return () => sub.remove();
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === "dark" ? "light" : "dark");
  }, [resolved, setMode]);

  const value = useMemo(
    () => ({ mode, resolved, colors, setMode, toggle }),
    [mode, resolved, colors, setMode, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/** Current palette — drop-in for former static CRM import */
export function useCRM(): ThemeColors {
  return useTheme().colors;
}
