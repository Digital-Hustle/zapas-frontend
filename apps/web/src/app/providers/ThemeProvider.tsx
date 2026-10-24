import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "zapas-theme";

const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "system",
  setTheme: () => undefined,
});

const resolve = (t: Theme) =>
  t === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;

function savedTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(savedTheme);

  useEffect(() => {
    const apply = () => document.documentElement.classList.toggle("dark", resolve(theme) === "dark");
    apply();
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [theme]);

  // Смена темы — плавный кроссфейд через View Transitions, где поддерживается.
  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* The selected appearance still applies when storage is unavailable. */
    }
    const apply = () => {
      setThemeState(t);
      document.documentElement.classList.toggle("dark", resolve(t) === "dark");
    };
    const supported = "startViewTransition" in document;
    if (supported && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      void document.startViewTransition(apply).finished.catch(() => undefined);
    else apply();
  }, []);

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
