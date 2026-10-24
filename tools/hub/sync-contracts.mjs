import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const auxiliaryPaths = ["contracts/redocly.yaml", "contracts/events/README.md"];
export function contractPath(path) {
  if (
    typeof path !== "string" ||
    !/^contracts\/(openapi|events|clients|examples)\//.test(path) ||
    path.split("/").some((part) => !part || part === "." || part === "..") ||
    path.includes("\\")
  ) {
    throw Error(`Invalid contract path: ${String(path)}`);
  }
  return path;
}

/** Validate every download and existing owned file before replacing the pinned snapshot. */
export async function syncContracts({ root, ref, explicit, read }) {
  if (!/^[0-9a-f]{40}$/.test(ref ?? "")) throw Error("ref must be a full commit SHA");
  const lockPath = join(root, "hub.lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  const manifestPath = join(root, "contracts/manifest.json");
  if (
    lock.contractsManifestSha256 &&
    (!existsSync(manifestPath) || hash(readFileSync(manifestPath)) !== lock.contractsManifestSha256)
  ) {
    throw Error("Local manifest modified or missing; preserve local work before sync");
  }
  const old = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { files: [] };
  const manifestBytes = await read("contracts/manifest.json");
  const manifestSha = hash(manifestBytes);
  if (!explicit && lock.contractsManifestSha256 && lock.contractsManifestSha256 !== manifestSha) {
    throw Error("Hub manifest changed; choose a reviewed commit with --ref");
  }
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const declared = new Set();
  for (const entry of manifest.files) {
    contractPath(entry.path);
    if (declared.has(entry.path)) throw Error(`Duplicate contract path: ${entry.path}`);
    if (!/^[0-9a-f]{64}$/.test(entry.sha256)) throw Error(`Invalid digest: ${entry.path}`);
    declared.add(entry.path);
  }
  const previous = [
    ...old.files,
    ...Object.entries(lock.auxiliaryFiles ?? {}).map(([path, sha256]) => ({ path, sha256 })),
  ];
  for (const entry of previous) {
    if (!auxiliaryPaths.includes(entry.path)) contractPath(entry.path);
    const path = join(root, entry.path);
    if (!existsSync(path) || hash(readFileSync(path)) !== entry.sha256) {
      throw Error(`Local contract modified or missing: ${entry.path}; preserve local work before sync`);
    }
  }
  const pending = new Map();
  const paths = [...manifest.files.map((entry) => entry.path), ...auxiliaryPaths];
  for (let offset = 0; offset < paths.length; offset += 8) {
    const entries = await Promise.all(
      paths.slice(offset, offset + 8).map(async (path) => [path, await read(path)]),
    );
    entries.forEach(([path, bytes]) => pending.set(path, bytes));
  }
  for (const entry of manifest.files) {
    if (hash(pending.get(entry.path)) !== entry.sha256) throw Error(`Contract hash mismatch: ${entry.path}`);
  }
  for (const [path, bytes] of pending) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), bytes);
  }
  for (const entry of old.files) {
    if (!declared.has(entry.path)) rmSync(join(root, entry.path));
  }
  writeFileSync(manifestPath, manifestBytes);
  writeFileSync(
    lockPath,
    JSON.stringify(
      {
        ...lock,
        ref,
        contractsManifestSha256: manifestSha,
        auxiliaryFiles: Object.fromEntries(auxiliaryPaths.map((path) => [path, hash(pending.get(path))])),
      },
      null,
      2,
    ) + "\n",
  );
  return manifest.files.length;
}
