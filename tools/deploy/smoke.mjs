import assert from "node:assert/strict";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { assertCommit } from "./gate.mjs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

export async function smokePreview(sha, base = "https://45.146.165.12") {
  assertCommit(sha);
  const directory = await mkdtemp(join(tmpdir(), "zapas-preview-smoke-"));
  const request = async (path, status) => {
    const result = spawnSync("curl", ["--proto", "=https", "--max-time", "15", "--silent", "--show-error", "--compressed",
      "--dump-header", join(directory, "headers"), "--output", join(directory, "body"), "--write-out", "%{http_code}", base + path], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(`Preview TLS request failed: ${result.stderr}`);
    const headers = new Headers();
    const blocks = (await readFile(join(directory, "headers"), "utf8")).trim().split(/\r?\n\r?\n/);
    for (const line of (blocks.at(-1) ?? "").split(/\r?\n/).slice(1)) {
      const colon = line.indexOf(":");
      if (colon > 0) headers.append(line.slice(0, colon), line.slice(colon + 1).trim());
    }
    const response = new Response(await readFile(join(directory, "body")), { status: Number(result.stdout), headers });
    assert.equal(response.status, status, path);
    return response;
  };
  try {
  for (const path of ["/", "/login", "/ui/", "/healthz"]) {
    const response = await request(path, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.ok(response.headers.get("content-security-policy"));
    await response.body?.cancel();
  }
  const deployment = await (await request("/deployment.json", 200)).json();
  assert.equal(deployment.frontendCommit, sha);
  assert.equal(deployment.preview, true); assert.equal(deployment.backend, false);
  for (const path of ["/internal/health", "/actuator/env", "/.env", "/.git/config", "/secrets/smtp.env", "/assets/missing.js", "/ui/assets/missing.js"]) {
    const response = await request(path, 404); await response.body?.cancel();
  }
  const unavailable = await request("/api/v1/auth-profile/auth/csrf", 503);
  assert.ok(unavailable.headers.get("content-type")?.includes("application/problem+json"));
  assert.equal((await unavailable.json()).status, 503);
  for (const path of ["/", "/ui/"]) {
    const response = await request(path, 200);
    assert.ok(response.headers.get("cache-control")?.includes("no-cache"));
    const entry = /src="([^"]+\.js)"/.exec(await response.text())?.[1];
    assert.ok(entry?.startsWith("/"));
    const asset = await request(entry, 200);
    assert.ok(asset.headers.get("cache-control")?.includes("immutable")); await asset.body?.cancel();
    const map = await request(entry + ".map", 404); await map.body?.cancel();
  }
  } finally { await rm(directory, { recursive: true, force: true }); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await smokePreview(process.env.PREVIEW_COMMIT);
  console.log("Preview TLS, release, SPA, assets, private paths and static API boundary passed.");
}
