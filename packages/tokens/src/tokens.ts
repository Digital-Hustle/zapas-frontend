/**
 * Единственный источник дизайн-значений (ADR-016, DESIGN.md).
 * Из него `pnpm --filter @zapas/tokens gen` строит theme.css, tokens.json (Android) и docs/DESIGN.tokens.md.
 * Значения в компонентах — только через классы/переменные, которые отсюда генерируются.
 */

export const palette = {
  white: "#FFFFFF",
  black: "#000000",
  green: {
    50: "#EAF8F0",
    100: "#CDEFDB",
    200: "#9EDFBA",
    300: "#69CC95",
    400: "#3CC57E",
    500: "#16A660",
    600: "#0D8045",
    700: "#0B6E3C",
    800: "#0A5531",
    900: "#083F25",
    950: "#04231A",
  },
  lime: { 300: "#CBEF85", 400: "#B5E655", 500: "#94C93A" },
  neutral: {
    0: "#FFFFFF",
    25: "#F6F8F7",
    50: "#EEF2F0",
    100: "#E2E8E5",
    200: "#CBD4CF",
    300: "#A9B5AE",
    400: "#7F8C85",
    500: "#55625B",
    600: "#3E4A44",
    700: "#2B3530",
    800: "#1A221E",
    850: "#121815",
    900: "#0B0F0D",
    950: "#060807",
  },
  red: {
    50: "#FEF0EE",
    100: "#FDDCD7",
    300: "#F59A8C",
    400: "#F0705E",
    500: "#E5483A",
    600: "#D92D20",
    700: "#B42318",
    900: "#55160C",
  },
  amber: {
    50: "#FFF7E6",
    100: "#FEEBC2",
    300: "#FCC860",
    400: "#FBB232",
    500: "#F59E0B",
    600: "#B45309",
    700: "#8A3F07",
    900: "#3D1D05",
  },
  blue: {
    50: "#EEF4FF",
    100: "#DAE6FE",
    300: "#93B4FA",
    400: "#6690F5",
    500: "#3B6FEE",
    600: "#2563EB",
    700: "#1D4FC4",
    900: "#11265C",
  },
} as const;

/** Семантика. Пара `x` / `x-foreground` проверяется на контраст ≥ 4.5:1 генератором. */
export const semantic = {
  light: {
    background: palette.neutral[25],
    foreground: "#0E1512",
    card: palette.white,
    "card-foreground": "#0E1512",
    popover: palette.white,
    "popover-foreground": "#0E1512",
    muted: palette.neutral[50],
    "muted-foreground": palette.neutral[500],
    subtle: palette.neutral[100],
    "subtle-foreground": palette.neutral[600],
    border: palette.neutral[100],
    "border-strong": palette.neutral[200],
    input: palette.neutral[200],
    ring: palette.green[500],
    primary: palette.green[600],
    "primary-foreground": palette.white,
    "primary-hover": palette.green[700],
    "primary-soft": palette.green[50],
    "primary-soft-foreground": palette.green[800],
    brand: palette.green[700],
    "brand-foreground": palette.white,
    accent: palette.lime[400],
    "accent-foreground": palette.green[950],
    success: palette.green[600],
    "success-foreground": palette.white,
    "success-soft": palette.green[50],
    "success-soft-foreground": palette.green[800],
    warning: palette.amber[500],
    "warning-foreground": palette.amber[900],
    "warning-soft": palette.amber[50],
    "warning-soft-foreground": palette.amber[700],
    danger: palette.red[600],
    "danger-foreground": palette.white,
    "danger-soft": palette.red[50],
    "danger-soft-foreground": palette.red[700],
    info: palette.blue[600],
    "info-foreground": palette.white,
    "info-soft": palette.blue[50],
    "info-soft-foreground": palette.blue[700],
    inverse: palette.neutral[850],
    "inverse-foreground": palette.neutral[25],
    overlay: "rgb(6 8 7 / 0.48)",
    "chart-balance": palette.green[600],
    "chart-band": "rgb(15 138 75 / 0.14)",
    "chart-threshold": palette.red[600],
    "chart-scenario": palette.blue[600],
    "chart-scenario-band": "rgb(37 99 235 / 0.10)",
    "chart-inflow": palette.green[500],
    "chart-outflow": palette.neutral[400],
    "chart-grid": palette.neutral[100],
    "chart-risk-zone": "rgb(217 45 32 / 0.08)",
  },
  dark: {
    background: palette.neutral[900],
    foreground: "#E8EEEA",
    card: palette.neutral[850],
    "card-foreground": "#E8EEEA",
    popover: palette.neutral[800],
    "popover-foreground": "#E8EEEA",
    muted: palette.neutral[800],
    "muted-foreground": "#9AA8A0",
    subtle: palette.neutral[700],
    "subtle-foreground": palette.neutral[200],
    border: palette.neutral[700],
    "border-strong": palette.neutral[600],
    input: palette.neutral[600],
    ring: palette.green[400],
    primary: palette.green[400],
    "primary-foreground": palette.green[950],
    "primary-hover": palette.green[300],
    "primary-soft": "rgb(60 197 126 / 0.14)",
    "primary-soft-foreground": palette.green[200],
    brand: palette.green[300],
    "brand-foreground": palette.green[950],
    accent: palette.lime[300],
    "accent-foreground": palette.green[950],
    success: palette.green[400],
    "success-foreground": palette.green[950],
    "success-soft": "rgb(60 197 126 / 0.14)",
    "success-soft-foreground": palette.green[200],
    warning: palette.amber[400],
    "warning-foreground": palette.amber[900],
    "warning-soft": "rgb(251 178 50 / 0.14)",
    "warning-soft-foreground": palette.amber[300],
    danger: palette.red[400],
    "danger-foreground": palette.red[900],
    "danger-soft": "rgb(240 112 94 / 0.14)",
    "danger-soft-foreground": palette.red[300],
    info: palette.blue[400],
    "info-foreground": palette.blue[900],
    "info-soft": "rgb(102 144 245 / 0.14)",
    "info-soft-foreground": palette.blue[300],
    inverse: palette.neutral[50],
    "inverse-foreground": palette.neutral[900],
    overlay: "rgb(0 0 0 / 0.6)",
    "chart-balance": palette.green[400],
    "chart-band": "rgb(60 197 126 / 0.18)",
    "chart-threshold": palette.red[400],
    "chart-scenario": palette.blue[400],
    "chart-scenario-band": "rgb(102 144 245 / 0.14)",
    "chart-inflow": palette.green[400],
    "chart-outflow": palette.neutral[400],
    "chart-grid": palette.neutral[700],
    "chart-risk-zone": "rgb(240 112 94 / 0.12)",
  },
} as const;

export type SemanticColor = keyof typeof semantic.light;

/** Пары, где допустим только крупный текст (≥ 18.66 px bold / 24 px) — контраст ≥ 3:1. */
export const contrastLargeTextOnly: readonly SemanticColor[] = ["warning", "accent"];

export const gradient = {
  brand: `linear-gradient(135deg, ${palette.green[600]} 0%, ${palette.green[400]} 55%, ${palette.lime[400]} 100%)`,
  hero: `radial-gradient(120% 80% at 80% 0%, rgb(181 230 85 / 0.22) 0%, transparent 60%), radial-gradient(90% 70% at 0% 20%, rgb(22 166 96 / 0.18) 0%, transparent 55%)`,
  "hero-dark": `radial-gradient(120% 80% at 80% 0%, rgb(181 230 85 / 0.10) 0%, transparent 60%), radial-gradient(90% 70% at 0% 20%, rgb(60 197 126 / 0.14) 0%, transparent 55%)`,
  sheen: "linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 0.5) 50%, transparent 100%)",
} as const;

export const font = {
  sans: `"Onest Variable", "Onest", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
  mono: `"JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace`,
} as const;

/** px: size / line-height / tracking (em) / роль */
export const text = {
  xs: { size: 12, lineHeight: 16, tracking: 0, role: "подписи, бейджи" },
  sm: {
    size: 13,
    lineHeight: 18,
    tracking: 0,
    role: "вторичный текст, таблицы",
  },
  base: { size: 14, lineHeight: 20, tracking: 0, role: "основной интерфейс" },
  md: {
    size: 16,
    lineHeight: 24,
    tracking: 0,
    role: "поля ввода (iOS без зума), абзацы",
  },
  lg: { size: 18, lineHeight: 26, tracking: -0.01, role: "подзаголовки" },
  xl: {
    size: 22,
    lineHeight: 28,
    tracking: -0.015,
    role: "заголовки карточек",
  },
  "2xl": {
    size: 28,
    lineHeight: 34,
    tracking: -0.02,
    role: "заголовки экранов, KPI",
  },
  "3xl": { size: 36, lineHeight: 42, tracking: -0.025, role: "крупные числа" },
  "4xl": { size: 48, lineHeight: 54, tracking: -0.03, role: "лендинг H2" },
  "5xl": { size: 64, lineHeight: 68, tracking: -0.035, role: "лендинг H1" },
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const spacingBase = 4;
/** Разрешённые шаги (множители spacingBase). Остальные ловит zapas-check. */
export const spacingSteps = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32] as const;

export const control = { sm: 36, md: 44, lg: 52 } as const;

export const layout = {
  sidebar: 264,
  sidebarCollapsed: 76,
  content: 1280,
  narrow: 720,
  header: 64,
  bottomNav: 64,
} as const;

/** Радиусы для обычного border-radius (Safari/Firefox). */
export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  "2xl": 32,
} as const;
/** Радиусы при `corner-shape: squircle` (Chromium 139+): суперэллипс визуально «съедает» ~40 % — шкала крупнее. */
export const radiusSquircle = {
  xs: 10,
  sm: 17,
  md: 24,
  lg: 30,
  xl: 40,
  "2xl": 54,
} as const;
/** Сглаживание суперэллипса для Android SquircleShape (0 — круг, 1 — максимум). */
export const squircleSmoothing = 0.6;

export const shadow = {
  light: {
    xs: "0 1px 2px rgb(14 21 18 / 0.05)",
    card: "0 1px 2px rgb(14 21 18 / 0.04), 0 4px 16px -6px rgb(14 21 18 / 0.08)",
    float: "0 2px 6px rgb(14 21 18 / 0.06), 0 16px 40px -12px rgb(14 21 18 / 0.18)",
    pop: "0 4px 12px rgb(14 21 18 / 0.08), 0 24px 56px -16px rgb(14 21 18 / 0.24)",
    glow: "0 0 0 6px rgb(22 166 96 / 0.12)",
  },
  dark: {
    xs: "0 1px 2px rgb(0 0 0 / 0.4)",
    card: "0 1px 2px rgb(0 0 0 / 0.3), 0 4px 16px -6px rgb(0 0 0 / 0.5)",
    float: "0 2px 6px rgb(0 0 0 / 0.4), 0 16px 40px -12px rgb(0 0 0 / 0.7)",
    pop: "0 4px 12px rgb(0 0 0 / 0.5), 0 24px 56px -16px rgb(0 0 0 / 0.8)",
    glow: "0 0 0 6px rgb(60 197 126 / 0.18)",
  },
} as const;

export const zIndex = {
  base: 0,
  raised: 1,
  sticky: 10,
  nav: 20,
  overlay: 50,
  modal: 60,
  popover: 65,
  toast: 70,
} as const;

export const breakpoint = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/** Движение. Пружины motion/react; секунды. Использовать через `@zapas/tokens/motion`. */
export const motion = {
  spring: {
    press: { type: "spring", stiffness: 520, damping: 22, mass: 0.6 },
    snappy: { type: "spring", bounce: 0.28, visualDuration: 0.32 },
    soft: { type: "spring", bounce: 0.22, visualDuration: 0.5 },
    pop: { type: "spring", bounce: 0.42, visualDuration: 0.45 },
    sheet: { type: "spring", bounce: 0.14, visualDuration: 0.42 },
    page: { type: "spring", bounce: 0.16, visualDuration: 0.45 },
    chart: { type: "spring", bounce: 0.1, visualDuration: 0.7 },
    hover: { type: "spring", bounce: 0, visualDuration: 0.3 },
    layout: { type: "spring", bounce: 0.12, visualDuration: 0.38 },
    number: { type: "spring", bounce: 0, visualDuration: 0.6 },
  },
  ease: {
    out: [0.22, 1, 0.36, 1],
    in: [0.4, 0, 1, 1],
    inOut: [0.65, 0, 0.35, 1],
    emphasized: [0.32, 0.72, 0, 1],
  },
  duration: {
    instant: 0.08,
    fast: 0.16,
    base: 0.24,
    slow: 0.36,
    page: 0.42,
    spin: 0.8,
    skeleton: 1.4,
    tooltip: 0.3,
    caret: 1.1,
  },
  stagger: { step: 0.035, max: 8 },
  distance: { enter: 12, exit: 8, lift: 3, slide: 24, shake: 6 },
  scale: { tap: 0.97, popIn: 0.96, hover: 1.01 },
  swipe: { offset: 96, velocity: 500 },
  toast: {
    success: 3000,
    info: 4000,
    warning: 5000,
    error: 7000,
    maxVisible: 3,
  },
  debounce: { search: 200, scenario: 250 },
} as const;

/** Android: соответствие пружин (dampingRatio, stiffness) для Compose `spring()`. */
export const composeSpring = {
  press: { dampingRatio: 0.62, stiffness: 520 },
  snappy: { dampingRatio: 0.72, stiffness: 380 },
  soft: { dampingRatio: 0.78, stiffness: 160 },
  pop: { dampingRatio: 0.58, stiffness: 200 },
  sheet: { dampingRatio: 0.86, stiffness: 230 },
  page: { dampingRatio: 0.84, stiffness: 200 },
} as const;

export const cssVar = (name: SemanticColor) => `var(--color-${name})` as const;
