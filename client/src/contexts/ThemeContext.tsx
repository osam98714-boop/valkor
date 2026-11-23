import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "gold-light" | "gold-dark" | "electric-dark" | "crimson-dark";
type ThemeContextType = { theme: Theme; setTheme: (theme: Theme) => void };
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const validThemes: Theme[] = ["gold-light", "gold-dark", "electric-dark", "crimson-dark"];

export function ThemeProvider({ children, defaultTheme = "gold-light" }: { children: React.ReactNode; defaultTheme?: Theme }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("valkor-theme") as Theme | null;
      return saved && validThemes.includes(saved) ? saved : defaultTheme;
    } catch { return defaultTheme; }
  });
  const setTheme = (next: Theme) => {
    if (validThemes.includes(next)) setThemeState(next);
  };
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("valkor-theme", theme); } catch { /* storage can be unavailable */ }
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
