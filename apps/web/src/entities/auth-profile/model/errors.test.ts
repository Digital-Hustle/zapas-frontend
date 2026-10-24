import { expect, it } from "vitest";
import { AuthProblem, authIssue } from "./errors.ts";

it("retains a mapped auth failure and absolute retry deadline", () => {
  const issue = { kind: "rate-limit" as const, message: "Повторите позже", retryAt: 1792800000000 };
  expect(authIssue(new AuthProblem(issue))).toEqual(issue);
});

it("keeps code failure distinct from an expired browser session", () => {
  expect(authIssue(new AuthProblem({ kind: "code-invalid", message: "Код не подходит" })).kind).toBe(
    "code-invalid",
  );
  expect(authIssue(new AuthProblem({ kind: "session-expired", message: "Войдите снова" })).kind).toBe(
    "session-expired",
  );
});

it("does not expose unrecognized exception messages or object fields", () => {
  for (const error of [
    new Error("private-server-details"),
    { kind: "offline", message: "private-server-details" },
    null,
  ]) {
    const issue = authIssue(error);
    expect(issue.kind).toBe("unknown");
    expect(issue.message).not.toContain("private-server-details");
  }
});
