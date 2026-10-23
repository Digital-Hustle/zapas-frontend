import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { root } from "../lib/run.mjs";

test("public API client contains no internal endpoints", () => {
  const dir = join(root, "packages/api/src/generated");
  for (const name of readdirSync(dir)) {
    const source = readFileSync(join(dir, name), "utf8");
    assert.ok(!source.includes("/internal/"), `${name}: internal endpoint exported`);
  }
});

test("contracts copy matches the hub manifest", () => {
  const manifest = JSON.parse(readFileSync(join(root, "contracts/manifest.json"), "utf8"));
  for (const f of manifest.files) {
    const digest = createHash("sha256").update(readFileSync(join(root, f.path))).digest("hex");
    assert.equal(digest, f.sha256, `stale contract: ${f.path}`);
  }
  const lock = JSON.parse(readFileSync(join(root, "hub.lock.json"), "utf8"));
  assert.match(lock.ref, /^[0-9a-f]{40}$/, "hub.lock.json must pin a commit SHA");
});

test("tokens keep both themes and squircle scale", () => {
  const data = JSON.parse(readFileSync(join(root, "packages/tokens/dist/tokens.json"), "utf8"));
  assert.deepEqual(Object.keys(data.color.light).sort(), Object.keys(data.color.dark).sort());
  assert.ok(data.radius.md > 0);
});