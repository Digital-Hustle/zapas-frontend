import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import process from "node:process";
import { assertCommit, requireGreen } from "./gate.mjs";
import { command } from "./build-preview.mjs";
import { smokePreview } from "./smoke.mjs";

export async function activateChecked({ activate, verify, rollback }) {
  activate();
  try { await verify(); }
  catch (error) {
    try { rollback(); }
    catch (rollbackError) { throw new AggregateError([error, rollbackError], "Preview check and rollback failed; inspect the current release"); }
    throw new Error("Preview check failed; previous release restored", { cause: error });
  }
}

export async function publishPreview({ sha, keyFile, directory = resolve("dist/preview"), gate = () => requireGreen({ sha, token: process.env.GH_TOKEN }), verify = () => smokePreview(sha) }) {
  assertCommit(sha);
  if (command("git", ["rev-parse", "HEAD"]) !== sha || command("git", ["status", "--porcelain"])) throw new Error("Publish requires a clean checkout of the expected commit");
  const manifest = JSON.parse(await readFile(join(directory, "web/deployment.json"), "utf8"));
  if (manifest.frontendCommit !== sha || manifest.preview !== true || typeof manifest.mockApi !== "boolean" || manifest.backend !== !manifest.mockApi) throw new Error("Invalid release manifest");
  const sshOptions = ["-i", resolve(keyFile), "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", `UserKnownHostsFile=${resolve(".github/preview_known_hosts")}`, "-o", "ConnectTimeout=15"];
  const server = "zapas-deploy@45.146.165.12";
  const ssh = (script) => command("ssh", [...sshOptions, server, script]);
  const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  const nonce = randomUUID().replaceAll("-", "");
  const release = `/opt/zapas/releases/${sha}`;
  const incoming = `/opt/zapas/releases/.incoming-${sha}-${nonce}`;
  const next = `/opt/zapas/preview/current.next-${nonce}`;
  try {
    if (ssh(`if test -d ${release}; then echo exists; fi`) !== "exists") {
      ssh(`mkdir -- ${incoming}`);
      command("rsync", ["-az", "--chmod=D755,F644", "-e", ["ssh", ...sshOptions].map(quote).join(" "), `${directory}/`, `${server}:${incoming}/`]);
      ssh(["set -eu", `test -s ${incoming}/web/index.html`, `test -s ${incoming}/ui/index.html`, `mv -T -- ${incoming} ${release}`].join("\n"));
    }
    await gate(); // Recheck main/checks after building and uploading, before switching traffic.
    const previous = ssh("readlink /opt/zapas/preview/current");
    if (!/^\/opt\/zapas\/releases\/[a-f0-9]{40}$/.test(previous)) throw new Error("Unexpected current release target; not switching traffic");
    await activateChecked({
      activate: () => ssh(["set -eu", `test -s ${release}/web/index.html`, `test -s ${release}/ui/index.html`, `ln -s ${release} ${next}`, `mv -Tf ${next} /opt/zapas/preview/current`].join("\n")),
      verify,
      rollback: () => ssh(["set -eu", `test "$(readlink /opt/zapas/preview/current)" = ${release}`, `ln -s ${previous} ${next}`, `mv -Tf ${next} /opt/zapas/preview/current`].join("\n")),
    });
  } finally {
    // Only our unique incomplete upload/link. Immutable release directories are retained.
    try { ssh(`rm -rf -- ${incoming} ${next}`); }
    catch { console.warn("Could not clean this run's temporary upload/link; immutable releases were retained."); }
  }
}

if (process.argv[1]?.endsWith("/publish-preview.mjs") || process.argv[1] === "tools/deploy/publish-preview.mjs") {
  const sha = assertCommit(process.env.PREVIEW_COMMIT);
  let keyFile = process.env.PREVIEW_KEY_FILE;
  let directory;
  try {
    if (!keyFile) {
      const secret = process.env.PREVIEW_SSH_KEY;
      delete process.env.PREVIEW_SSH_KEY;
      if (!secret) throw new Error("PREVIEW_SSH_KEY secret or PREVIEW_KEY_FILE is required");
      directory = await mkdtemp(join(tmpdir(), "zapas-preview-key-"));
      keyFile = join(directory, "key");
      await writeFile(keyFile, secret.endsWith("\n") ? secret : `${secret}\n`, { mode: 0o600 });
    }
    await publishPreview({ sha, keyFile });
    console.log(`Published checked preview ${sha}; real Gateway API enabled.`);
  } finally { if (directory) await rm(directory, { recursive: true, force: true }); }
}
