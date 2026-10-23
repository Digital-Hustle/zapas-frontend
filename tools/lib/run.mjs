import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const isWin = process.platform === "win32";

// На Windows npm-утилиты — это .cmd; запускаем их через cmd.exe /d /s /c без shell:true,
// аргументы передаются массивом (без склейки строки).
const WIN_CMD_SHIMS = new Set(["pnpm", "npx", "npm", "corepack"]);

function resolve(cmd, args) {
  if (!isWin) return [cmd, args];
  if (WIN_CMD_SHIMS.has(cmd) || cmd.endsWith(".bat") || cmd.endsWith(".cmd")) {
    return ["cmd.exe", ["/d", "/s", "/c", cmd, ...args]];
  }
  return [cmd, args];
}

export function run(cmd, args, { cwd = root, allowFail = false, quiet = false } = {}) {
  if (!quiet) console.log(`\n› ${cmd} ${args.join(" ")}  (${cwd.replace(root, ".") || "."})`);
  const [bin, argv] = resolve(cmd, args);
  const res = spawnSync(bin, argv, { cwd, stdio: quiet ? "pipe" : "inherit", encoding: "utf8" });
  if ((res.status !== 0 || res.error) && !allowFail) {
    const err = new Error(`${cmd} ${args.join(" ")} failed (${res.status ?? res.error?.code})`);
    err.status = res.status;
    throw err;
  }
  return res;
}

export function has(cmd) {
  const probe = isWin ? spawnSync("where", [cmd], { encoding: "utf8" }) : spawnSync("sh", ["-c", `command -v ${cmd}`]);
  return probe.status === 0;
}

export const gradlew = (dir) => join(dir, isWin ? "gradlew.bat" : "gradlew");
export const exists = (p) => existsSync(join(root, p));
