#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "../lib/run.mjs";
import { syncContracts } from "./sync-contracts.mjs";

const args = process.argv.slice(2);
const index = args.indexOf("--ref");
const lock = JSON.parse(readFileSync(join(root, "hub.lock.json"), "utf8"));
const ref = index >= 0 ? args[index + 1] : lock.ref;
if (!/^[0-9a-f]{40}$/.test(ref ?? "")) throw Error("ref должен быть полным commit SHA");
if (!/^[\w.-]+\/[\w.-]+$/.test(lock.hub)) throw Error("Invalid hub repository");
const count = await syncContracts({
  root,
  ref,
  explicit: index >= 0,
  read: async (path) => {
    const response = await fetch(`https://raw.githubusercontent.com/${lock.hub}/${ref}/${path}`);
    if (!response.ok) throw Error(`GET ${path}: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  },
});
console.log(`contracts synced: ${lock.hub}@${ref.slice(0, 7)}, ${count} файлов`);
