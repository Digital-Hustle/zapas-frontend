#!/usr/bin/env node
// Первый запуск во frontend-репозитории.
import { existsSync, copyFileSync, symlinkSync, mkdirSync, cpSync } from "node:fs";
import { join } from "node:path";
import { run, has, root, isWin } from "./lib/run.mjs";
import { satisfiesNode } from "./lib/node-version.mjs";

const minimumNode = "24.18.0";
if (!satisfiesNode(process.versions.node, minimumNode)) {
  console.error(`✗ Node ${process.versions.node}: требуется ${minimumNode}+ (см. .nvmrc)`);
  process.exit(1);
}
console.log(`✓ Node ${process.versions.node}`);

for (const [cmd, label, required] of [
  ["node", "Node 24.18+", true],
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
console.log("Готово. pnpm contracts:mock для схемных моков; pnpm check перед PR.");