// tokens.ts → dist/theme.css (Tailwind 4), dist/tokens.json (Android), docs/DESIGN.tokens.md.
// --check: не пишет файлы, падает при расхождении или недостаточном контрасте.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import * as t from "../src/tokens.ts";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(pkg, "..", "..", "..");
const check = process.argv.includes("--check");

const px = (v: number) => `${v}px`;

// ---------- контраст (WCAG 2.x) ----------
function parse(color: string): [number, number, number, number] | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1] ?? "000000", 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgb = /^rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)$/.exec(color);
  if (rgb)
    return [
      Number(rgb[1]),
      Number(rgb[2]),
      Number(rgb[3]),
      rgb[4] ? Number(rgb[4]) : 1,
    ];
  return null;
}
function blend(
  fg: [number, number, number, number],
  bg: [number, number, number, number],
): [number, number, number, number] {
  const a = fg[3];
  return [
    fg[0] * a + bg[0] * (1 - a),
    fg[1] * a + bg[1] * (1 - a),
    fg[2] * a + bg[2] * (1 - a),
    1,
  ];
}
function lum([r, g, b]: [number, number, number, number]) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const [cr = 0, cg = 0, cb = 0] = c;
  return 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
}
function contrast(a: string, b: string, base: string): number | null {
  const pb = parse(base);
  const pa = parse(a);
  const pc = parse(b);
  if (!pa || !pc || !pb) return null;
  const A = blend(pa, pb);
  const B = blend(pc, blend(pa, pb));
  const [l1, l2] = [lum(A), lum(B)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

const errors: string[] = [];
const contrastRows: string[] = [];
for (const theme of ["light", "dark"] as const) {
  const sem = t.semantic[theme] as Record<string, string>;
  for (const [name, value] of Object.entries(sem)) {
    if (!name.endsWith("-foreground")) continue;
    const bgName = name.replace(/-foreground$/, "");
    const bg = sem[bgName];
    if (!bg) continue;
    const ratio = contrast(bg, value, sem.background ?? "#FFFFFF");
    if (ratio === null) continue;
    const min = (t.contrastLargeTextOnly as readonly string[]).includes(bgName)
      ? 3
      : 4.5;
    const ok = ratio >= min;
    contrastRows.push(
      `| ${theme} | \`${bgName}\` / \`${name}\` | ${ratio.toFixed(2)} | ${min} | ${ok ? "✓" : "✗"} |`,
    );
    if (!ok)
      errors.push(
        `контраст ${theme} ${bgName}/${name} = ${ratio.toFixed(2)} < ${min}`,
      );
  }
  const fgRatio = contrast(
    sem.background ?? "#FFFFFF",
    sem["muted-foreground"] ?? "#000000",
    sem.background ?? "#FFFFFF",
  );
  if (fgRatio !== null && fgRatio < 4.5)
    errors.push(
      `контраст ${theme} background/muted-foreground = ${fgRatio.toFixed(2)} < 4.5`,
    );
}

// ---------- theme.css ----------
const lines: string[] = [];
const L = (s = "") => lines.push(s);
L(
  "/* СГЕНЕРИРОВАНО из src/tokens.ts — не редактировать. pnpm --filter @zapas/tokens gen */",
);
L('@import "tailwindcss";');
L("@custom-variant dark (&:where(.dark, .dark *));");
L();
L("@theme {");
for (const reset of [
  "--color-*",
  "--text-*",
  "--radius-*",
  "--shadow-*",
  "--ease-*",
  "--animate-*",
  "--font-*",
  "--breakpoint-*",
  "--inset-shadow-*",
  "--drop-shadow-*",
  "--blur-*",
])
  L(`  ${reset}: initial;`);
L(`  --font-sans: ${t.font.sans};`);
L(`  --font-mono: ${t.font.mono};`);
for (const name of Object.keys(t.semantic.light))
  L(`  --color-${name}: var(--${name});`);
L("  --color-transparent: transparent;");
L("  --color-current: currentColor;");
for (const [k, v] of Object.entries(t.text)) {
  L(`  --text-${k}: ${px(v.size)};`);
  L(`  --text-${k}--line-height: ${px(v.lineHeight)};`);
  if (v.tracking) L(`  --text-${k}--letter-spacing: ${v.tracking}em;`);
}
for (const [k, v] of Object.entries(t.fontWeight))
  L(`  --font-weight-${k}: ${v};`);
L(`  --spacing: ${px(t.spacingBase)};`);
for (const [k, v] of Object.entries(t.control))
  L(`  --spacing-control-${k}: ${px(v)};`);
for (const [k, v] of Object.entries(t.layout))
  L(
    `  --spacing-${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}: ${px(v)};`,
  );
for (const k of Object.keys(t.radius)) L(`  --radius-${k}: var(--r-${k});`);
L("  --radius-full: 9999px;");
for (const k of Object.keys(t.shadow.light))
  L(`  --shadow-${k}: var(--sh-${k});`);
for (const [k, v] of Object.entries(t.motion.ease))
  L(`  --ease-${k}: cubic-bezier(${v.join(", ")});`);
for (const [k, v] of Object.entries(t.breakpoint))
  L(`  --breakpoint-${k}: ${px(v)};`);
L("  --blur-glass: 20px;");
L("}");
L();
const vars = (theme: "light" | "dark") => {
  const out: string[] = [];
  for (const [k, v] of Object.entries(t.semantic[theme]))
    out.push(`  --${k}: ${v};`);
  for (const [k, v] of Object.entries(t.shadow[theme]))
    out.push(`  --sh-${k}: ${v};`);
  out.push(
    `  --gradient-hero: ${theme === "light" ? t.gradient.hero : t.gradient["hero-dark"]};`,
  );
  out.push(`  color-scheme: ${theme};`);
  return out;
};
L(":root {");
vars("light").forEach((l) => L(l));
for (const [k, v] of Object.entries(t.radius)) L(`  --r-${k}: ${px(v)};`);
L(`  --gradient-brand: ${t.gradient.brand};`);
L(`  --gradient-sheen: ${t.gradient.sheen};`);
for (const [k, v] of Object.entries(t.zIndex)) L(`  --z-${k}: ${v};`);
for (const [k, v] of Object.entries(t.motion.duration))
  L(`  --duration-${k}: ${Math.round(v * 1000)}ms;`);
L("}");
L(".dark {");
vars("dark").forEach((l) => L(l));
L("}");
L();
L(
  "/* Суперэллипс (ADR-016): только где поддерживается; шкала радиусов крупнее, т. к. squircle визуально «съедает» угол. */",
);
L("@supports (corner-shape: squircle) {");
L("  :root {");
for (const [k, v] of Object.entries(t.radiusSquircle))
  L(`    --r-${k}: ${px(v)};`);
L("  }");
L("  *, ::before, ::after { corner-shape: squircle; }");
L(
  '  .rounded-full, [class*="rounded-full"], [data-shape="round"] { corner-shape: round; }',
);
L('  [class*="rounded-[inherit]"] { corner-shape: inherit; }');
L("}");
L();
for (const [k, v] of Object.entries(t.zIndex))
  L(`@utility z-${k} {\n  z-index: ${v};\n}`);
for (const [k, v] of Object.entries(t.motion.duration))
  L(
    `@utility duration-${k} {\n  transition-duration: ${Math.round(v * 1000)}ms;\n}`,
  );
L(
  `@utility clip-squircle {\n  clip-path: inset(0 round var(--clip-r, var(--r-md)));\n  @supports (corner-shape: squircle) {\n    clip-path: none;\n  }\n}`,
);
L(
  `@utility bg-brand-gradient {\n  background-image: var(--gradient-brand);\n}`,
);
L(
  `@utility text-brand-gradient {\n  background-image: var(--gradient-brand);\n  background-clip: text;\n  color: transparent;\n}`,
);
L(`@utility bg-hero {\n  background-image: var(--gradient-hero);\n}`);
L(
  `@utility glass {\n  background-color: color-mix(in oklab, var(--card) 72%, transparent);\n  backdrop-filter: blur(var(--blur-glass)) saturate(160%);\n}`,
);
L(`@utility max-h-dialog {\n  max-height: 88svh;\n}`);
L(`@utility max-h-sheet {\n  max-height: 92svh;\n}`);
L(`@utility tabular {\n  font-variant-numeric: tabular-nums;\n}`);
L(`@utility pt-safe {\n  padding-top: env(safe-area-inset-top);\n}`);
L(`@utility pb-safe {\n  padding-bottom: env(safe-area-inset-bottom);\n}`);
L(
  `@utility scrollbar-none {\n  scrollbar-width: none;\n  &::-webkit-scrollbar {\n    display: none;\n  }\n}`,
);
L();
L("@layer base {");
L(
  "  html { font-family: var(--font-sans); background: var(--background); color: var(--foreground); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }",
);
L(
  "  body { min-height: 100svh; font-size: var(--text-base); line-height: var(--text-base--line-height); }",
);
L("  * { border-color: var(--border); }");
L("  :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }");
L(
  "  ::selection { background: var(--primary-soft); color: var(--primary-soft-foreground); }",
);
L(
  "  html { scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent; }",
);
L("  input, textarea, select, button { font: inherit; }");
L(
  "  @media (pointer: coarse) { input, textarea { font-size: var(--text-md); } }",
);
L(
  "  ::view-transition-old(root), ::view-transition-new(root) { animation-duration: var(--duration-slow); }",
);
L(
  "  @media (prefers-reduced-motion: reduce) { *, ::before, ::after { transition-duration: 0ms !important; scroll-behavior: auto !important; } }",
);
L("}");
const css = await format(lines.join("\n") + "\n", {
  parser: "css",
  printWidth: 110,
});

// ---------- tokens.json (Android) ----------
const rawJson =
  JSON.stringify(
    {
      $comment: "СГЕНЕРИРОВАНО из frontend/packages/tokens/src/tokens.ts",
      color: t.semantic,
      text: t.text,
      fontWeight: t.fontWeight,
      spacingBase: t.spacingBase,
      spacingSteps: t.spacingSteps,
      control: t.control,
      radius: t.radiusSquircle,
      squircleSmoothing: t.squircleSmoothing,
      zIndex: t.zIndex,
      motion: {
        spring: t.composeSpring,
        duration: t.motion.duration,
        distance: t.motion.distance,
        scale: t.motion.scale,
        toast: t.motion.toast,
      },
    },
    null,
    2,
  ) + "\n";
const json = await format(rawJson, { parser: "json", printWidth: 110 });

// ---------- DESIGN.tokens.md ----------
const md = [
  "# Токены (сгенерировано)",
  "",
  "Источник — `frontend/packages/tokens/src/tokens.ts`. Не редактировать вручную.",
  "",
  "## Цвета",
  "| Токен | Светлая | Тёмная |",
  "|---|---|---|",
  ...Object.keys(t.semantic.light).map(
    (k) =>
      `| \`${k}\` | \`${(t.semantic.light as Record<string, string>)[k]}\` | \`${(t.semantic.dark as Record<string, string>)[k]}\` |`,
  ),
  "",
  "## Контраст",
  "| Тема | Пара | Контраст | Минимум | |",
  "|---|---|---|---|---|",
  ...contrastRows,
  "",
  "## Типографика",
  "| Класс | Размер / строка | Трекинг | Роль |",
  "|---|---|---|---|",
  ...Object.entries(t.text).map(
    ([k, v]) =>
      `| \`text-${k}\` | ${v.size} / ${v.lineHeight} | ${v.tracking}em | ${v.role} |`,
  ),
  "",
  "## Радиусы",
  "| Класс | Обычный | Squircle |",
  "|---|---|---|",
  ...Object.keys(t.radius).map(
    (k) =>
      `| \`rounded-${k}\` | ${(t.radius as Record<string, number>)[k]} | ${(t.radiusSquircle as Record<string, number>)[k]} |`,
  ),
  "",
  "## Отступы",
  `Шаг ${t.spacingBase} px. Разрешены: ${t.spacingSteps.map((s) => `\`${s}\``).join(", ")}. Контролы: ${Object.entries(
    t.control,
  )
    .map(([k, v]) => `\`h-control-${k}\` ${v}`)
    .join(", ")}.`,
  "",
  "## Движение",
  "| Пресет | Значение |",
  "|---|---|",
  ...Object.entries(t.motion.spring).map(
    ([k, v]) => `| \`spring.${k}\` | \`${JSON.stringify(v)}\` |`,
  ),
  ...Object.entries(t.motion.duration).map(
    ([k, v]) => `| \`duration.${k}\` | ${v} s |`,
  ),
  "",
].join("\n");

const outputs: [string, string][] = [
  [join(pkg, "dist", "theme.css"), css],
  [join(pkg, "dist", "tokens.json"), json],
  [join(repo, "docs", "DESIGN.tokens.md"), md],
];
const androidTokens = join(
  repo,
  "android",
  "core",
  "designsystem",
  "src",
  "main",
  "assets",
  "tokens.json",
);
if (existsSync(join(repo, "android", "core", "designsystem")))
  outputs.push([androidTokens, json]);

let drift = false;
for (const [file, content] of outputs) {
  const current = existsSync(file) ? readFileSync(file, "utf8") : null;
  if (current === content) continue;
  if (check) {
    drift = true;
    errors.push(`устарел: ${file.replace(repo, ".")}`);
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
}
if (errors.length) {
  console.error("✗ tokens:\n  " + errors.join("\n  "));
  if (drift) console.error("Запустите: pnpm --filter @zapas/tokens gen");
  process.exit(1);
}
console.log(
  check
    ? "✓ tokens: актуальны, контраст в норме"
    : `✓ tokens: сгенерировано ${outputs.length} файла(ов)`,
);
