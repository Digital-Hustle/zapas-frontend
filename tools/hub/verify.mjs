#!/usr/bin/env node
// Проверка синхронизированных контрактов без сети: manifest ↔ файлы ↔ hub.lock.json.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, sep } from "node:path";
import { root } from "../lib/run.mjs";
import { auxiliaryPaths, contractPath } from "./sync-contracts.mjs";

const manifestPath = join(root, "contracts", "manifest.json");
const lockPath = join(root, "hub.lock.json");
const problems = [];
if (!existsSync(manifestPath))
  problems.push("нет contracts/manifest.json — запустите node tools/hub/sync.mjs");
if (!existsSync(lockPath)) problems.push("нет hub.lock.json — запустите node tools/hub/sync.mjs");
let manifest = { files: [] };
if (existsSync(manifestPath)) {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, "utf8")) : {};
  const manifestSha = createHash("sha256").update(readFileSync(manifestPath)).digest("hex");
  if (lock.contractsManifestSha256 && lock.contractsManifestSha256 !== manifestSha) {
    problems.push("hub.lock.json: contractsManifestSha256 не совпадает с contracts/manifest.json");
  }
  if (!lock.hub || !lock.ref) problems.push("hub.lock.json: нужны hub и ref (commit SHA)");
  for (const f of manifest.files) {
    contractPath(f.path);
    const p = join(root, f.path);
    if (!existsSync(p)) {
      problems.push(`нет файла ${f.path}`);
      continue;
    }
    const sha = createHash("sha256").update(readFileSync(p)).digest("hex");
    if (sha !== f.sha256) problems.push(`изменён вручную: ${f.path}`);
  }
  for (const [path, digest] of Object.entries(lock.auxiliaryFiles ?? {})) {
    if (!auxiliaryPaths.includes(path)) {
      problems.push(`неизвестная конфигурация: ${path}`);
      continue;
    }
    const absolute = join(root, path);
    if (
      !existsSync(absolute) ||
      createHash("sha256").update(readFileSync(absolute)).digest("hex") !== digest
    ) {
      problems.push(`изменена конфигурация хаба: ${path}`);
    }
  }
  const declared = new Set(manifest.files.map((f) => f.path));
  for (const dir of ["contracts/openapi", "contracts/events"]) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs)) {
      const p = join(abs, name);
      if (statSync(p).isDirectory() || !/\.(ya?ml|json)$/.test(name) || name === "manifest.json") continue;
      const rel = relative(root, p).split(sep).join("/");
      if (!declared.has(rel)) problems.push(`лишний файл вне манифеста: ${rel}`);
    }
  }
}
if (problems.length) {
  console.error("✗ contracts sync:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(
  `contracts sync: ${manifest.files.length} файлов совпадают с хабом ${JSON.parse(readFileSync(lockPath, "utf8")).ref.slice(0, 7)}`,
);
