import type { AuthIssue } from "./types.ts";
export class AuthProblem extends Error {
  constructor(readonly issue: AuthIssue) {
    super(issue.message);
  }
}
export function authIssue(error: unknown): AuthIssue {
  if (error instanceof AuthProblem && error.issue.kind !== "unknown") return error.issue;
  return { kind: "unknown", message: "Сервис временно недоступен. Попробуйте ещё раз." };
}
