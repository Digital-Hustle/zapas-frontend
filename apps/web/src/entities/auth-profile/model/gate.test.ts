import { expect, it } from "vitest";
import { sessionGate } from "./gate.ts";

it("only requests login for a confirmed expired session", () => {
  expect(sessionGate({ available: true, hasProfile: true, pending: false, failure: "session-expired" })).toBe(
    "expired",
  );
  expect(sessionGate({ available: true, hasProfile: true, pending: false, failure: "offline" })).toBe(
    "ready",
  );
  expect(sessionGate({ available: true, hasProfile: false, pending: false, failure: "unavailable" })).toBe(
    "error",
  );
});

it("does not turn a missing adapter or pending request into a logout", () => {
  expect(sessionGate({ available: false, hasProfile: false, pending: true, failure: null })).toBe(
    "unavailable",
  );
  expect(sessionGate({ available: true, hasProfile: false, pending: true, failure: null })).toBe("loading");
});
