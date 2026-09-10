import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, Platform, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
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

function applyWebDocument(resolved: ResolvedTheme) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  root.style.backgroundColor = resolved === "dark" ? "#0b141a" : "#f0f2f5";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#0b141a" : "#f0f2f5");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [ready, setReady] = useState(false);

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
