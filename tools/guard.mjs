#!/usr/bin/env node
// Красные линии frontend-репозитория. Остальное проверяют eslint, zapas-check и typecheck.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { run, root } from "./lib/run.mjs";

const staged = process.argv.includes("--staged");
const listArgs = staged ? ["diff", "--cached", "--name-only", "--diff-filter=ACM"] : ["ls-files", "--cached", "--others", "--exclude-standard"];
const files = (run("git", listArgs, { quiet: true }).stdout ?? "").split("\n").filter(Boolean);

const rules = [
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, "приватный ключ в репозитории"],
  [/\b(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16})\b/, "похоже на секретный ключ"],
  [/^(?!\s*#).*\b(PASSWORD|SECRET|API_KEY|TOKEN)=(?!\.\.\.|\$\{|$)\S+/m, ".env.example: только NAME=...", { only: [/\.env\.example$/] }],
  [/localStorage\.(setItem|getItem)\(\s*["'`][^"'`]*(token|jwt|refresh)/i, "токены не храним в localStorage"],
  [/<select[\s>]|<input[^>]*type=["'](date|datetime-local|time|month|number)["']|\bwindow\.(alert|confirm|prompt)\(|(?<![.\w])(alert|confirm|prompt)\(/, "нативные контролы/диалоги запрещены — @zapas/ui"],
  [/from ["'](framer-motion|react-spring|@react-spring\/[^"']+|gsap|animejs)["']/, "анимации только motion/react"],
  [/@keyframes|animate-(spin|pulse|bounce|ping)\b/, "CSS-анимации запрещены — motion + токены", { exclude: [/packages\/ui\/.*\.(css|tsx)$/] }],
  [/"(\^|~)\d/, "версии зависимостей фиксированы точно", { only: [/(^|\/)package\.json$/] }],
  [/continue-on-error:\s*true/, "проверки CI не отключаем", { only: [/\.github\/workflows\/.*\.ya?ml$/] }],
  [/pull_request_target:/, "pull_request_target запрещён", { only: [/\.github\/workflows\/.*\.ya?ml$/] }],
  [/\bTODO\b|\bFIXME\b/, "TODO не мёржим — заведите задачу", { only: [/(apps|packages\/[a-z-]+)\/src\/.*\.(ts|tsx)$/], exclude: [/\.test\./] }],
  [/dangerouslySetInnerHTML/, "запрещено (XSS)"],
  [/https?:\/\/(fonts\.googleapis|cdn\.jsdelivr|unpkg)\./, "внешние CDN запрещены CSP — self-host"],
  [/contracts\/(openapi|events)\/.*\.(ya?ml|json)/, "контракты правятся в хабе, не здесь", { only: [/\.md$/] }],
];
const problems = [];
for (const f of files) {
  const path = join(root, f);
  if (!existsSync(path) || /\.(png|jpg|webp|ico|woff2?|zip|docx)$/.test(f) || f.includes("node_modules/") || f.startsWith("contracts/")) continue;
  if (f.startsWith("tools/") || f.startsWith("packages/config/") || f.startsWith(".agents/")) continue;
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  for (const [re, msg, opts = {}] of rules) {
    if (opts.only && !opts.only.some((r) => r.test(f))) continue;
    if (opts.exclude && opts.exclude.some((r) => r.test(f))) continue;
    const m = re.exec(text);
    if (m) problems.push(`${f}:${text.slice(0, m.index).split("\n").length}  ${msg}`);
  }
}
if (problems.length) {
  console.error("✗ guard:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`✓ guard: ${files.length} файлов, нарушений нет`);