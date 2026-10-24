import assert from "node:assert/strict";
import { test } from "node:test";
import { satisfiesNode } from "../lib/node-version.mjs";

const minimum = "24.18.0";

test("the pinned minimum and newer patch/minor lines are accepted", () => {
  for (const version of ["24.18.0", "v24.18.0", "24.18.1", "24.21.0", "25.0.0", "26.1.2"]) {
    assert.equal(satisfiesNode(version, minimum), true, version);
  }
});

test("older versions are rejected so Prism cannot fail later with an engine error", () => {
  for (const version of ["24.17.9", "24.0.0", "23.11.1", "22.22.0", "20.0.0"]) {
    assert.equal(satisfiesNode(version, minimum), false, version);
  }
});

test("malformed versions fail loudly instead of being guessed", () => {
  for (const version of ["", null, undefined, "24", "24.18", "next", "24.x.0"]) {
    assert.throws(() => satisfiesNode(version, minimum), /Unsupported Node version/);
  }
});