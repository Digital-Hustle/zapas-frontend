import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { syncContracts } from "../hub/sync-contracts.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const ref = "a".repeat(40);
const oldPath = "contracts/openapi/ledger.yaml";
const newPath = "contracts/openapi/orchestrator.openapi.yaml";
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "zapas-hub-sync-"));
  const put = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  put(oldPath, "old");
  const oldManifest = JSON.stringify({ files: [{ path: oldPath, sha256: hash("old") }] });
  put("contracts/manifest.json", oldManifest);
  put(
    "hub.lock.json",
    JSON.stringify({ hub: "Digital-Hustle/zapas", ref, contractsManifestSha256: hash(oldManifest) }),
  );
  const incoming = {
    "contracts/manifest.json": JSON.stringify({ files: [{ path: newPath, sha256: hash("new") }] }),
    [newPath]: "new",
    "contracts/redocly.yaml": "apis: {}",
    "contracts/events/README.md": "No events in v1",
  };
  const read = async (path) => Buffer.from(incoming[path]);
  return { root, put, incoming, read, close: () => rmSync(root, { recursive: true, force: true }) };
}

test("migration removes only retired manifest-owned files and pins the validated hub revision", async () => {
  const f = fixture();
  try {
    f.put("contracts/notes.md", "keep this local guide");
    await syncContracts({ root: f.root, ref, explicit: true, read: f.read });
    assert.equal(existsSync(join(f.root, oldPath)), false);
    assert.equal(readFileSync(join(f.root, newPath), "utf8"), "new");
    assert.equal(readFileSync(join(f.root, "contracts/notes.md"), "utf8"), "keep this local guide");
    const lock = JSON.parse(readFileSync(join(f.root, "hub.lock.json"), "utf8"));
    assert.equal(lock.ref, ref);
    assert.equal(lock.contractsManifestSha256, hash(f.incoming["contracts/manifest.json"]));
    assert.equal(lock.auxiliaryFiles["contracts/redocly.yaml"], hash(f.incoming["contracts/redocly.yaml"]));
  } finally {
    f.close();
  }
});

test("a failed download or mismatched hash leaves the old files and lock intact", async () => {
  for (const failure of ["download", "hash"]) {
    const f = fixture();
    try {
      const lock = readFileSync(join(f.root, "hub.lock.json"), "utf8");
      await assert.rejects(
        syncContracts({
          root: f.root,
          ref,
          explicit: true,
          read: async (path) => {
            if (path === newPath) {
              if (failure === "download") throw Error("offline");
              return Buffer.from("corrupt");
            }
            return f.read(path);
          },
        }),
      );
      assert.equal(readFileSync(join(f.root, oldPath), "utf8"), "old");
      assert.equal(readFileSync(join(f.root, "hub.lock.json"), "utf8"), lock);
      assert.equal(existsSync(join(f.root, newPath)), false);
    } finally {
      f.close();
    }
  }
});

test("local edits to a retired contract are never silently deleted", async () => {
  const f = fixture();
  try {
    f.put(oldPath, "unfinished local work");
    await assert.rejects(
      syncContracts({ root: f.root, ref, explicit: true, read: f.read }),
      /local|modified/i,
    );
    assert.equal(readFileSync(join(f.root, oldPath), "utf8"), "unfinished local work");
  } finally {
    f.close();
  }
});

test("an edited local manifest cannot claim another local file for deletion", async () => {
  const f = fixture();
  try {
    f.put("contracts/clients/local.json", "unfinished");
    f.put(
      "contracts/manifest.json",
      JSON.stringify({ files: [{ path: "contracts/clients/local.json", sha256: hash("unfinished") }] }),
    );
    await assert.rejects(
      syncContracts({ root: f.root, ref, explicit: true, read: f.read }),
      /local manifest/i,
    );
    assert.equal(readFileSync(join(f.root, "contracts/clients/local.json"), "utf8"), "unfinished");
  } finally {
    f.close();
  }
});

test("a manifest cannot write outside the contract directories or reuse a path", async () => {
  for (const paths of [["contracts/../outside.ts"], [newPath, newPath]]) {
    const f = fixture();
    try {
      f.incoming["contracts/manifest.json"] = JSON.stringify({
        files: paths.map((path) => ({ path, sha256: hash("new") })),
      });
      await assert.rejects(
        syncContracts({ root: f.root, ref, explicit: true, read: f.read }),
        /path|duplicate/i,
      );
      assert.equal(readFileSync(join(f.root, oldPath), "utf8"), "old");
    } finally {
      f.close();
    }
  }
});
