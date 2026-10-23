#!/usr/bin/env node
// Первый запуск во frontend-репозитории.
import { existsSync, copyFileSync, symlinkSync, mkdirSync, cpSync } from "node:fs";
import { join } from "node:path";
import { run, has, root, isWin } from "./lib/run.mjs";

for (const [cmd, label, required] of [
  ["node", "Node 24", true],
  ["pnpm", "pnpm 10 (corepack enable)", true],
  ["git", "Git", true],
  ["gitleaks", "gitleaks (секреты)", false],
]) {
  const ok = has(cmd);
  console.log(`${ok ? "✓" : required ? "✗" : "!"} ${label}`);
  if (!ok && required) process.exit(1);
}
run("pnpm", ["install", "--frozen-lockfile"]);
run("pnpm", ["exec", "lefthook", "install"]);
const link = join(root, ".claude", "skills");
if (!existsSync(link)) {
  mkdirSync(join(root, ".claude"), { recursive: true });
  try {
    symlinkSync(join(root, ".agents", "skills"), link, isWin ? "junction" : "dir");
  } catch {
    cpSync(join(root, ".agents", "skills"), link, { recursive: true });
    console.log("! symlink недоступен — скиллы скопированы в .claude/skills");
  }
}
console.log("Готово. pnpm dev:mock для UI без backend; pnpm check перед PR.");