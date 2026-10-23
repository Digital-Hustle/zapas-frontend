#!/usr/bin/env node
// Синхронизация контрактов из хаба. Без --ref проверяет закреплённый ref; с --ref переключает на новый commit.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { root } from "../lib/run.mjs";

const args = process.argv.slice(2);
const refIndex = args.indexOf("--ref");
const explicit = refIndex >= 0;
const lockPath = join(root, "hub.lock.json");
const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const ref = explicit ? args[refIndex + 1] : lock.ref;
if (!/^[0-9a-f]{40}$/.test(ref ?? "")) throw new Error("ref должен быть полным commit SHA");
const [owner, repo] = lock.hub.split("/");
const raw = (path) => `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;

async function get(path) {
  const res = await fetch(raw(path));
  if (!res.ok) throw new Error(`GET ${path}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const manifestBytes = await get("contracts/manifest.json");
const manifestSha = createHash("sha256").update(manifestBytes).digest("hex");
if (!explicit && lock.contractsManifestSha256 && manifestSha !== lock.contractsManifestSha256) {
  throw new Error("manifest хаба изменился: проверьте контрактный PR и запустите sync --ref <новый sha>");
}
const manifest = JSON.parse(manifestBytes.toString("utf8"));
for (const f of manifest.files) {
  const bytes = await get(f.path);
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== f.sha256) throw new Error(`hash mismatch: ${f.path}`);
  const dest = join(root, f.path);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, bytes);
}
writeFileSync(join(root, "contracts", "manifest.json"), manifestBytes);
writeFileSync(lockPath, JSON.stringify({ ...lock, hub: `${owner}/${repo}`, ref, contractsManifestSha256: manifestSha }, null, 2) + "\n");
console.log(`contracts synced: ${owner}/${repo}@${ref.slice(0, 7)}, ${manifest.files.length} файлов`);