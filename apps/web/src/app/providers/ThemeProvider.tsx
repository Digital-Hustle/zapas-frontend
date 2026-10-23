import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";
const KEY = "zapas-theme";

const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "system",
  setTheme: () => undefined,
});

const resolve = (t: Theme) =>
  t === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    : t;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(KEY) as Theme | null) ?? "system",
  );

  useEffect(() => {
    const apply = () =>
      document.documentElement.classList.toggle(
        "dark",
        resolve(theme) === "dark",
      );
    apply();
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [theme]);

  // Смена темы — плавный кроссфейд через View Transitions, где поддерживается.
  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(KEY, t);
    const supported = "startViewTransition" in document;
    if (
      supported &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      document.startViewTransition(() => setThemeState(t));
    else setThemeState(t);
  }, []);

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
