import process from "node:process";
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
execFileSync(command, ["exec", "orval", "--config", "orval.config.ts"], { stdio: "inherit" });
for (const retired of ["ledger", "planning", "forecast", "notify"]) {
  rmSync(new URL(`./src/generated/${retired}.ts`, import.meta.url), { force: true });
}
