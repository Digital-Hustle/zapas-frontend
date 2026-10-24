import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { activateChecked } from "../deploy/publish-preview.mjs";
import { copyPublicBuild } from "../deploy/build-preview.mjs";
import { assertCommit, checksPassed, requireGreen } from "../deploy/gate.mjs";

test("only the newest successful required checks authorize a release", () => {
  const checks = ["frontend", "summary", "security"].map((name, id) => ({ name, id, status: "completed", conclusion: "success" }));
  assert.equal(checksPassed(checks), true);
  assert.equal(checksPassed([...checks, { name: "security", id: 10, status: "completed", conclusion: "failure" }]), false);
  assert.equal(checksPassed(checks.slice(0, 2)), false);
  assert.throws(() => assertCommit("main")); assert.throws(() => assertCommit("a".repeat(40) + ";ls"));
});
test("a stale commit is rejected even with a green historical CI", async () => {
  await assert.rejects(requireGreen({ sha: "a".repeat(40), token: "test-only", fetcher: async () => ({ ok: true, json: () => ({ object: { sha: "b".repeat(40) } }) }) }), /no longer current main/);
});
test("a verification failure restores the previous release and remains a failed deploy", async () => {
  let current = "previous";
  await assert.rejects(activateChecked({ activate: () => { current = "new"; }, verify: async () => { throw new Error("HTTP 500"); }, rollback: () => { current = "previous"; } }), /previous release restored/);
  assert.equal(current, "previous");
});
test("a failed activation never attempts to roll back an unrelated current release", async () => {
  let restored = false;
  await assert.rejects(activateChecked({ activate: () => { throw new Error("SSH unavailable"); }, verify: async () => undefined, rollback: () => { restored = true; } }), /SSH unavailable/);
  assert.equal(restored, false);
});
test("the public package excludes source maps and refuses hidden files and symlinks", async () => {
  const directory = await mkdtemp(join(tmpdir(), "zapas-preview-test-"));
  try {
    const source = join(directory, "source"); await mkdir(source);
    await writeFile(join(source, "index.html"), "public"); await writeFile(join(source, "app.js.map"), "private source");
    await copyPublicBuild(source, join(directory, "result"));
    assert.equal(await readFile(join(directory, "result/index.html"), "utf8"), "public");
    await assert.rejects(readFile(join(directory, "result/app.js.map")), /ENOENT/);
    await writeFile(join(source, ".env"), "not a real secret");
    await assert.rejects(copyPublicBuild(source, join(directory, "hidden")), /Hidden file/);
    await rm(join(source, ".env")); await symlink(join(source, "index.html"), join(source, "linked.html"));
    await assert.rejects(copyPublicBuild(source, join(directory, "linked")), /Symlink/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
