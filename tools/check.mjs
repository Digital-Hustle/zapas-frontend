#!/usr/bin/env node
// Локальные проверки frontend = CI. Использование: node tools/check.mjs <zone...|changed|all>
import { run, root, has, exists } from "./lib/run.mjs";
import { join } from "node:path";

const zones = {
  contracts: () => {
    run("node", ["tools/hub/verify.mjs"]);
    run("pnpm", ["exec", "redocly", "lint", "--config", "contracts/redocly.yaml", "--format=summary"]);
  },
  frontend: () => {
    run("node", ["tools/check-tokens.mjs"]);
    run("pnpm", ["-r", "--filter", "./apps/**", "--filter", "./packages/**", "run", "--if-present", "lint"]);
    run("pnpm", ["-r", "--filter", "./apps/**", "--filter", "./packages/**", "run", "--if-present", "typecheck"]);
    run("node", ["packages/config/zapas-check.mjs"]);
    run("pnpm", ["-r", "--filter", "./apps/**", "--filter", "./packages/**", "run", "--if-present", "test"]);
    run("pnpm", ["-r", "--filter", "./apps/**", "--filter", "./packages/**", "run", "--if-present", "build"]);
  },
  tooling: () => {
    run("node", ["--test", "tools/tests/repo.test.mjs", "tools/tests/authorship.test.mjs"]);
    run("node", ["tools/guard.mjs"]);
  },
  security: () => {
    run("node", ["tools/guard.mjs"]);
    if (has("gitleaks")) run("gitleaks", ["git", "--redact", "--no-banner"]);
    else console.warn("! gitleaks не установлен — локально пропущено, в CI обязательно");
  },
};

function changedZones() {
  const base = run("git", ["merge-base", "HEAD", "origin/main"], { quiet: true, allowFail: true }).stdout?.trim();
  const diff = run("git", ["diff", "--name-only", base || "HEAD~1", "HEAD"], { quiet: true, allowFail: true }).stdout ?? "";
  const status = run("git", ["status", "--porcelain"], { quiet: true }).stdout ?? "";
  const files = [...diff.split("\n"), ...status.split("\n").map((l) => l.slice(3))].filter(Boolean);
  const out = new Set(["tooling", "security", "contracts"]);
  if (files.some((f) => /^(apps|packages|package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|\.npmrc|tools\/check\.mjs|tools\/check-tokens\.mjs)/.test(f))) out.add("frontend");
  return [...out];
}

const args = process.argv.slice(2);
if (!args.length) {
  console.log("Зоны: contracts, frontend, tooling, security, changed, all");
  process.exit(0);
}
const selected = args.includes("all") ? ["contracts", "frontend", "tooling", "security"] : args.includes("changed") ? changedZones() : args;
const failed = [];
for (const z of selected) {
  const fn = zones[z];
  if (!fn) {
    console.error(`Неизвестная зона: ${z}`);
    process.exit(2);
  }
  console.log(`\n══ ${z} ══`);
  try {
    fn();
  } catch (e) {
    failed.push(z);
    console.error(`✗ ${z}: ${e.message}`);
  }
}
console.log(failed.length ? `\n✗ Провалены: ${failed.join(", ")}` : `\n✓ Проверки пройдены: ${selected.join(", ")}`);
process.exit(failed.length ? 1 : 0);