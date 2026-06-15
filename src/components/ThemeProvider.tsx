"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Light/dark theme, persisted in localStorage under `pw_theme`. The `dark` class
 * is applied to <html> by an inline script in layout.tsx BEFORE React hydrates
 * (no flash); this provider only mirrors that state and handles toggling.
 */

type Theme = "light" | "dark";
const LS_KEY = "pw_theme";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeState>({ theme: "light", toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // Sync with whatever the inline script already decided.
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem(LS_KEY, next);
      } catch {
        /* ignore quota/availability errors */
      }
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): ThemeState => useContext(ThemeContext);
