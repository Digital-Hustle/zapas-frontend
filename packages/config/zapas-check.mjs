#!/usr/bin/env node
// FSD/дизайн-проверки frontend-репозитория (без литералов, нативных контролов и обхода слоёв).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const targets = process.argv.slice(2).length
  ? process.argv.slice(2).map((p) => join(root, p))
  : ["apps/web", "apps/admin", "packages/ui", "packages/charts"].map((p) => join(root, p)).filter(existsSync);

const allowedSpacing = new Set(["0", "0.5", "1", "1.5", "2", "2.5", "3", "4", "5", "6", "8", "10", "12", "16", "20", "24", "32", "px", "auto", "full"]);
const spacingPrefixes = "p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap|gap-x|gap-y|space-x|space-y|inset|inset-x|inset-y|top|bottom|left|right|start|end";
const rules = [
  ["hardcoded-color", /(?:^|["'`\s(:,{])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|\b(?:rgba?|hsla?|oklch|oklab)\(\s*[\d.]/, "цвет только из токенов"],
  ["arbitrary-value", /(?<![\w-])-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*-\[(?!var\(|--|inherit\]|calc\(var)[^\]\s"'`]+\]/, "произвольное значение Tailwind — добавьте токен"],
  ["z-literal", /\bz-(?:\d+|\[\d+\])\b|zIndex:\s*\d/, "z-index только из шкалы"],
  ["motion-literal", /\b(?:duration|delay|stiffness|damping|mass|bounce|visualDuration|staggerChildren|delayChildren)\s*:\s*(?!0\b)\d|\bease\s*:\s*\[|(?<![\w-])(?:duration|delay)-\d+(?![\w-])/, "тайминги только из @zapas/tokens/motion"],
  ["inline-style-size", /style=\{\{[^}]*\b(?:padding|margin|gap|fontSize|lineHeight|borderRadius|letterSpacing|fontWeight)\w*\s*:\s*["'`]?-?\d/, "размеры в inline-style запрещены"],
  ["tailwind-default-color", /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline)-(?:slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?\b/, "палитра Tailwind выключена — семантические токены"],
  ["spinner", /\b(?:animate-spin|Loader2|Spinner)\b/, "вместо спиннеров — Skeleton (кроме Button loading)"],
  ["emoji", /\p{Extended_Pictographic}/u, "эмодзи в интерфейсе запрещены"],
];
const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", "dist", "generated", "coverage", "e2e", "public"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) && !name.endsWith(".d.ts")) check(p);
  }
}

function check(file) {
  const rel = relative(root, file).split(sep).join("/");
  const isUiInternal = rel.startsWith("packages/ui/");
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (/zapas-check-ignore/.test(line)) return;
    for (const [id, re, msg] of rules) {
      if (id === "spinner" && isUiInternal) continue;
      if (id === "hardcoded-color" && file.endsWith(".css") && isUiInternal) continue;
      if (re.test(line)) problems.push(`${rel}:${i + 1} [${id}] ${msg}`);
    }
    const sp = new RegExp(`(?<![\\w-])-?(?:${spacingPrefixes})-(\\d+(?:\\.\\d+)?)(?![\\w.])`, "g");
    for (const m of line.matchAll(sp)) if (!allowedSpacing.has(m[1])) problems.push(`${rel}:${i + 1} [spacing-scale] шаг ${m[1]} вне сетки`);
  });
  const appMatch = /^apps\/[^/]+\/src\/(app|pages|widgets|features|entities|shared)\/([^/]+)/.exec(rel);
  if (appMatch) {
    const [, layer, slice] = appMatch;
    for (const m of readFileSync(file, "utf8").matchAll(/from\s+["'](@\/(pages|widgets|features|entities)\/([^/"']+)(\/[^"']+)?)["']/g)) {
      const [, spec, l, s, rest] = m;
      if (rest) problems.push(`${rel} [public-api] импорт ${spec}: только через index.ts слайса`);
      if (l === layer && s === slice) problems.push(`${rel} [relative-inside-slice] внутри слайса — относительные пути`);
      if (l === layer && s !== slice && layer !== "shared") problems.push(`${rel} [cross-slice] слайсы одного слоя не импортируют друг друга`);
    }
  }
}

for (const t of targets) if (existsSync(t)) walk(t);
if (problems.length) {
  console.error(`✗ zapas-check: ${problems.length} нарушений\n  ` + problems.join("\n  "));
  process.exit(1);
}
console.log(`✓ zapas-check: ${targets.map((t) => relative(root, t)).join(", ")}`);