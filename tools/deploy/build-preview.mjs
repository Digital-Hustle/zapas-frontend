import { cp, lstat, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { assertCommit } from "./gate.mjs";

/** Never package source maps, hidden files, source/config files or symlinks. */
export async function copyPublicBuild(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) throw new Error("Hidden file in public build");
    const source = join(from, entry.name), target = join(to, entry.name);
    if ((await lstat(source)).isSymbolicLink()) throw new Error("Symlink in public build");
    if (entry.isDirectory()) await copyPublicBuild(source, target);
    else if (entry.name.endsWith(".map")) continue;
    else if (!/\.(?:html|js|css|json|woff2?|ttf|svg|png|jpe?g|webp|avif|ico|txt)$/.test(entry.name)) throw new Error(`Unexpected public build file: ${entry.name}`);
    else await cp(source, target);
  }
}
export function command(program, args, env = process.env) {
  const result = spawnSync(program, args, { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(`${program} failed: ${result.stderr || result.error?.message || "unknown error"}`);
  return result.stdout.trim();
}
export async function buildPreview(sha, output = resolve("dist/preview")) {
  assertCommit(sha);
  if (command("git", ["rev-parse", "HEAD"]) !== sha || command("git", ["status", "--porcelain"])) throw new Error("Build requires a clean checkout of the expected commit");
  const scratch = await mkdtemp(join(tmpdir(), "zapas-preview-build-"));
  try {
    const mockApi = process.env.PREVIEW_MOCK_API === "1";
    const webEnv = { ...process.env, VITE_API_BASE: "" };
    if (mockApi) webEnv.VITE_PREVIEW_MOCKS = "1";
    else delete webEnv.VITE_PREVIEW_MOCKS;
    command("pnpm", ["--filter", "@zapas/web", "exec", "vite", "build", "--outDir", join(scratch, "web"), "--emptyOutDir"], webEnv);
    command("pnpm", ["--filter", "@zapas/web", "exec", "vite", "build", "../../packages/ui/examples", "--config", "vite.config.ts", "--base=/ui/", "--outDir", join(scratch, "ui"), "--emptyOutDir"]);
    await rm(output, { recursive: true, force: true });
    for (const surface of ["web", "ui"]) await copyPublicBuild(join(scratch, surface), join(output, surface));
    await writeFile(join(output, "web/deployment.json"), JSON.stringify({ frontendCommit: sha, preview: true, backend: !mockApi, mockApi, ui: "/ui/" }, null, 2) + "\n");
    return output;
  } finally { await rm(scratch, { recursive: true, force: true }); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(await buildPreview(process.env.PREVIEW_COMMIT ?? command("git", ["rev-parse", "HEAD"])));
}
