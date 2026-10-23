import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyAuthorship } from "../ci/authorship-policy.mjs";

const repository = { id: 1, full_name: "Digital-Hustle/zapas" };
const pr = { user: { login: "author" }, title: "docs: architecture", body: "", head: { repo: { id: 1 } } };
const commit = (login = "author", message = "docs: update specification") => ({
  sha: "0123456789",
  author: { login, id: 42, type: "User" },
  commit: { message },
});
const check = (commits, extra = {}) => verifyAuthorship({ repository, pr, commits, ...extra });

test("accepts the PR author's attributed commits without permission lookup", async () => {
  assert.deepEqual(await check([commit()], { getPermission: () => assert.fail("unexpected lookup") }), []);
});
test("preserves an author's commit alongside a verified maintainer's conflict resolution", async () => {
  const lookups = [];
  const errors = await check([commit(), commit("maintainer"), commit("maintainer")], {
    getPermission: async (login) => {
      lookups.push(login);
      return "admin";
    },
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(lookups, ["maintainer"]);
});
test("read and triage access cannot substitute for a maintainer", async () => {
  for (const permission of ["read", "triage", "none", undefined]) {
    assert.match(
      (await check([commit("other")], { getPermission: async () => permission })).join(),
      /write access/,
    );
  }
});
test("write and maintain roles allow same-repository collaboration", async () => {
  for (const permission of ["write", "maintain"]) {
    assert.deepEqual(await check([commit("other")], { getPermission: async () => permission }), []);
  }
});
test("a fork cannot borrow another contributor's identity", async () => {
  const errors = await check([commit("maintainer")], {
    pr: { ...pr, head: { repo: { id: 2 } } },
    getPermission: () => assert.fail("fork must not query repository permissions"),
  });
  assert.match(errors.join(), /fork/);
});
test("unattributed and bot commits are rejected for human PRs", async () => {
  for (const author of [null, { login: "author", type: "Bot", id: 42 }]) {
    assert.match((await check([{ ...commit(), author }])).join(), /personal GitHub/);
  }
});
test("permission lookup failures fail closed", async () => {
  await assert.rejects(
    check([commit("other")], {
      getPermission: async () => {
        throw new Error("HTTP 403");
      },
    }),
    /HTTP 403/,
  );
});
test("maintainer access never exempts generated-author footers or PR boilerplate", async () => {
  const errors = await check([commit("maintainer", "docs: update\nCo-authored-by: coding-agent")], {
    pr: { ...pr, body: "Generated with AI" },
    getPermission: async () => "admin",
  });
  assert.equal(errors.length, 2);
  assert.ok(errors.every((error) => /boilerplate|footer/.test(error)));
});
test("automated dependency PRs retain their existing exception", async () => {
  assert.deepEqual(
    await check(
      [
        {
          ...commit(),
          author: { login: "dependabot[bot]", type: "Bot", id: 42 },
        },
      ],
      { pr: { ...pr, user: { login: "dependabot[bot]" } } },
    ),
    [],
  );
});
